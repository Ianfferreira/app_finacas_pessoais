-- P0: settle one or several receivables atomically. A settlement is never
-- inferred from an incoming transfer; the caller supplies the exact charges
-- it settles. Any excess must remain a separately classified credit or entry.
create function public.record_manual_third_party_entry(
  p_person_id uuid,
  p_kind public.third_party_entry_kind,
  p_amount numeric(18, 2),
  p_occurred_on date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  entry_id uuid;
  signed_amount numeric(18, 2);
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_kind not in ('charge', 'reimbursement', 'adjustment') or p_amount <= 0 then
    raise exception 'manual entry requires a supported kind and a positive amount' using errcode = '22023';
  end if;
  if not exists (select 1 from public.people where id = p_person_id and user_id = u) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  signed_amount := case when p_kind = 'charge' then p_amount else -p_amount end;
  insert into public.third_party_entries (user_id, person_id, kind, amount, occurred_on, note)
  values (u, p_person_id, p_kind, signed_amount, coalesce(p_occurred_on, current_date), nullif(trim(p_note), ''))
  returning id into entry_id;
  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'third_party_entry', entry_id, 'third_party_entry_recorded_manually', jsonb_build_object('kind', p_kind, 'amount', signed_amount));
  return entry_id;
end;
$$;

create function public.record_third_party_settlement(
  p_person_id uuid,
  p_amount numeric(18, 2),
  p_occurred_on date,
  p_note text,
  p_allocations jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  settlement_id uuid;
  settlement_entry_id uuid;
  item jsonb;
  entry_id uuid;
  entry_amount numeric(18, 2);
  allocated_before numeric(18, 2);
  allocation_amount numeric(18, 2);
  allocation_total numeric(18, 2) := 0;
  seen_entries uuid[] := '{}';
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_amount <= 0 or jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) = 0 then
    raise exception 'settlement requires a positive amount and non-empty allocations' using errcode = '22023';
  end if;
  if not exists (select 1 from public.people where id = p_person_id and user_id = u) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;

  for item in select value from jsonb_array_elements(p_allocations)
  loop
    if jsonb_typeof(item) <> 'object'
      or item ->> 'entryId' is null
      or item ->> 'entryId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or item ->> 'amount' is null
      or item ->> 'amount' !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'each settlement allocation requires entryId and a decimal amount' using errcode = '22023';
    end if;
    entry_id := (item ->> 'entryId')::uuid;
    allocation_amount := (item ->> 'amount')::numeric(18, 2);
    if allocation_amount <= 0 or entry_id = any(seen_entries) then
      raise exception 'settlement allocation must be positive and unique per entry' using errcode = '22023';
    end if;
    select amount into entry_amount
    from public.third_party_entries
    where id = entry_id and user_id = u and person_id = p_person_id
      and kind in ('charge', 'adjustment') and amount > 0
    for update;
    if not found then raise exception 'receivable entry not found' using errcode = 'P0002'; end if;
    select coalesce(sum(amount), 0) into allocated_before
    from public.settlement_allocations
    where user_id = u and third_party_entry_id = entry_id;
    if allocation_amount > entry_amount - allocated_before then
      raise exception 'settlement allocation exceeds the open receivable' using errcode = '23514';
    end if;
    allocation_total := allocation_total + allocation_amount;
    seen_entries := array_append(seen_entries, entry_id);
  end loop;
  if allocation_total <> p_amount then
    raise exception 'settlement allocation total (%) must equal settlement amount (%)', allocation_total, p_amount using errcode = '23514';
  end if;

  insert into public.settlements (user_id, person_id, amount, occurred_on, note)
  values (u, p_person_id, p_amount, coalesce(p_occurred_on, current_date), nullif(trim(p_note), ''))
  returning id into settlement_id;
  for item in select value from jsonb_array_elements(p_allocations)
  loop
    insert into public.settlement_allocations (user_id, settlement_id, third_party_entry_id, amount)
    values (u, settlement_id, (item ->> 'entryId')::uuid, (item ->> 'amount')::numeric(18, 2));
  end loop;
  insert into public.third_party_entries (user_id, person_id, kind, amount, occurred_on, note)
  values (u, p_person_id, 'settlement', -p_amount, coalesce(p_occurred_on, current_date), nullif(trim(p_note), ''))
  returning id into settlement_entry_id;
  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'settlement', settlement_id, 'third_party_settlement_recorded', jsonb_build_object(
    'person_id', p_person_id, 'amount', p_amount, 'settlement_entry_id', settlement_entry_id, 'allocation_count', jsonb_array_length(p_allocations)
  ));
  return settlement_id;
end;
$$;

revoke all on function public.record_manual_third_party_entry(uuid, public.third_party_entry_kind, numeric, date, text) from public;
grant execute on function public.record_manual_third_party_entry(uuid, public.third_party_entry_kind, numeric, date, text) to authenticated;
revoke all on function public.record_third_party_settlement(uuid, numeric, date, text, jsonb) from public;
grant execute on function public.record_third_party_settlement(uuid, numeric, date, text, jsonb) to authenticated;
