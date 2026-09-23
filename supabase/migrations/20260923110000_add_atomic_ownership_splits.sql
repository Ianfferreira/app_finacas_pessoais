-- P0: write an ownership split, its third-party ledger projection, review
-- resolution, manual lock, and audit event as one atomic operation.
--
-- The API accepts either all exact amounts or all percentages. Percentages are
-- rounded down to cents and the remaining cents are assigned in declaration
-- order, matching the pure domain rule documented in ADR 0002.
create function public.set_transaction_ownership(
  p_transaction_id uuid,
  p_mode text,
  p_allocations jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  tx public.transactions%rowtype;
  item jsonb;
  calculated jsonb := '[]'::jsonb;
  old_allocations jsonb;
  allocation_count integer;
  item_index integer;
  residual_index integer;
  owner_value text;
  person_value text;
  person_value_uuid uuid;
  seen_people uuid[] := '{}';
  self_count integer := 0;
  supplied_amount numeric(18, 2);
  supplied_percentage numeric(9, 6);
  calculated_amount numeric(18, 2);
  calculated_total numeric(18, 2) := 0;
  percentage_total numeric(9, 6) := 0;
  residual_cents integer;
  calculated_item jsonb;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_mode not in ('amount', 'percentage') then
    raise exception 'p_mode must be amount or percentage' using errcode = '22023';
  end if;
  if jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) = 0 then
    raise exception 'p_allocations must be a non-empty array' using errcode = '22023';
  end if;

  select * into tx
  from public.transactions
  where id = p_transaction_id and user_id = u and not is_void
  for update;

  if not found then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;
  if tx.nature not in ('expense', 'reversal') then
    raise exception 'ownership splits are only supported for expenses and reversals' using errcode = '22023';
  end if;

  for item, item_index in
    select element.value, element.ordinality::integer
    from jsonb_array_elements(p_allocations) with ordinality as element(value, ordinality)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'each allocation must be an object' using errcode = '22023';
    end if;

    owner_value := item ->> 'ownerType';
    if owner_value not in ('self', 'third_party') then
      raise exception 'ownerType must be self or third_party' using errcode = '22023';
    end if;

    person_value_uuid := null;
    if owner_value = 'self' then
      self_count := self_count + 1;
      if self_count > 1 or item ->> 'personId' is not null then
        raise exception 'there may be at most one self allocation, without personId' using errcode = '22023';
      end if;
    else
      person_value := item ->> 'personId';
      if person_value is null
        or person_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception 'third_party allocations require a valid personId' using errcode = '22023';
      end if;
      person_value_uuid := person_value::uuid;
      if person_value_uuid = any(seen_people) then
        raise exception 'a person may appear only once in an ownership split' using errcode = '22023';
      end if;
      if not exists (
        select 1 from public.people p where p.id = person_value_uuid and p.user_id = u
      ) then
        raise exception 'person not found' using errcode = 'P0002';
      end if;
      seen_people := array_append(seen_people, person_value_uuid);
    end if;

    if p_mode = 'amount' then
      if item ->> 'amount' is null or item ->> 'amount' !~ '^[0-9]+(\.[0-9]{1,2})?$' then
        raise exception 'amount must be a positive decimal with at most two places' using errcode = '22023';
      end if;
      supplied_amount := (item ->> 'amount')::numeric(18, 2);
      if supplied_amount <= 0 then
        raise exception 'amount must be greater than zero' using errcode = '22023';
      end if;
      calculated_amount := supplied_amount;
      calculated_total := calculated_total + calculated_amount;
      calculated := calculated || jsonb_build_array(jsonb_build_object(
        'owner_type', owner_value,
        'person_id', person_value_uuid,
        'amount', calculated_amount,
        'percentage', null
      ));
    else
      if item ->> 'percentage' is null or item ->> 'percentage' !~ '^[0-9]+(\.[0-9]{1,6})?$' then
        raise exception 'percentage must have at most six decimal places' using errcode = '22023';
      end if;
      supplied_percentage := (item ->> 'percentage')::numeric(9, 6);
      if supplied_percentage <= 0 then
        raise exception 'percentage must be greater than zero' using errcode = '22023';
      end if;
      percentage_total := percentage_total + supplied_percentage;
      calculated_amount := trunc(tx.amount * supplied_percentage / 100, 2);
      calculated_total := calculated_total + calculated_amount;
      calculated := calculated || jsonb_build_array(jsonb_build_object(
        'owner_type', owner_value,
        'person_id', person_value_uuid,
        'amount', calculated_amount,
        'percentage', supplied_percentage
      ));
    end if;
  end loop;

  allocation_count := jsonb_array_length(calculated);
  if p_mode = 'amount' and calculated_total <> tx.amount then
    raise exception 'allocation total (%) must equal transaction amount (%)', calculated_total, tx.amount using errcode = '23514';
  end if;
  if p_mode = 'percentage' then
    if percentage_total <> 100 then
      raise exception 'percentages must sum exactly to 100' using errcode = '22023';
    end if;
    residual_cents := ((tx.amount - calculated_total) * 100)::integer;
    for residual_index in 0 .. residual_cents - 1 loop
      item_index := residual_index % allocation_count;
      calculated_item := calculated -> item_index;
      calculated := jsonb_set(
        calculated,
        array[item_index::text, 'amount'],
        to_jsonb(((calculated_item ->> 'amount')::numeric(18, 2)) + 0.01),
        false
      );
    end loop;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(calculated) candidate
    where (candidate ->> 'amount')::numeric(18, 2) <= 0
  ) then
    raise exception 'each allocation must resolve to at least one cent' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'owner_type', a.owner_type,
    'person_id', a.person_id,
    'amount', a.amount,
    'percentage', a.percentage
  ) order by a.created_at, a.id), '[]'::jsonb)
  into old_allocations
  from public.allocations a
  where a.user_id = u and a.transaction_id = tx.id;

  if exists (
    select 1
    from public.settlement_allocations sa
    join public.third_party_entries e
      on e.id = sa.third_party_entry_id and e.user_id = sa.user_id
    where sa.user_id = u
      and e.transaction_id = tx.id
      and e.kind in ('charge', 'adjustment')
  ) then
    raise exception 'ownership cannot change after a related settlement' using errcode = '23514';
  end if;

  delete from public.third_party_entries
  where user_id = u and transaction_id = tx.id and kind in ('charge', 'adjustment');
  delete from public.allocations where user_id = u and transaction_id = tx.id;

  for item in select value from jsonb_array_elements(calculated)
  loop
    insert into public.allocations (user_id, transaction_id, owner_type, person_id, amount, percentage, source)
    values (
      u,
      tx.id,
      (item ->> 'owner_type')::public.owner_type,
      nullif(item ->> 'person_id', '')::uuid,
      (item ->> 'amount')::numeric(18, 2),
      case when item ->> 'percentage' is null then null else (item ->> 'percentage')::numeric(9, 6) end,
      'manual'::public.decision_source
    );

    if item ->> 'owner_type' = 'third_party' then
      insert into public.third_party_entries (user_id, person_id, transaction_id, kind, amount, occurred_on, note)
      values (
        u,
        (item ->> 'person_id')::uuid,
        tx.id,
        case when tx.nature = 'expense' then 'charge'::public.third_party_entry_kind else 'adjustment'::public.third_party_entry_kind end,
        case when tx.nature = 'expense' then (item ->> 'amount')::numeric(18, 2) else -((item ->> 'amount')::numeric(18, 2)) end,
        coalesce(tx.occurred_on, tx.competence_month),
        'Rateio manual da movimentação'
      );
    end if;
  end loop;

  update public.transactions
  set ownership_source = 'manual',
      ownership_confidence = 1,
      manual_locks = manual_locks || jsonb_build_object('ownership', true)
  where id = tx.id and user_id = u;

  insert into public.review_items (user_id, transaction_id, type, status, detail, resolved_at)
  values (u, tx.id, 'ownership', 'resolved', jsonb_build_object('mode', p_mode), now())
  on conflict (user_id, transaction_id, type) do update
  set status = 'resolved', detail = excluded.detail, resolved_at = now(), updated_at = now();

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'transaction', tx.id, 'ownership_set_manually', jsonb_build_object(
    'mode', p_mode,
    'before', old_allocations,
    'after', calculated
  ));
end;
$$;

revoke all on function public.set_transaction_ownership(uuid, text, jsonb) from public;
grant execute on function public.set_transaction_ownership(uuid, text, jsonb) to authenticated;
