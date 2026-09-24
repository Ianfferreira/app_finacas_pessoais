-- P0: category decisions must use the same protected path as manual nature
-- decisions. The raw source stays immutable; only interpretation changes.
create function public.set_transaction_category_manual(
  p_transaction_id uuid,
  p_category_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  tx public.transactions%rowtype;
  category public.categories%rowtype;
  expected_kind public.category_kind;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into tx
  from public.transactions
  where id = p_transaction_id and user_id = u
  for update;
  if not found or tx.is_void then
    raise exception 'active transaction not found' using errcode = 'P0002';
  end if;

  expected_kind := case
    when tx.nature in ('expense', 'reversal') then 'expense'::public.category_kind
    when tx.nature in ('income', 'investment_income') then 'income'::public.category_kind
    else null
  end;
  if expected_kind is null then
    raise exception 'transaction nature cannot receive a category' using errcode = '22023';
  end if;

  select * into category
  from public.categories
  where id = p_category_id and user_id = u;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  if category.kind <> expected_kind then
    raise exception 'category kind does not match transaction nature' using errcode = '22023';
  end if;

  update public.transactions
  set category_id = category.id,
      subcategory_id = null,
      category_source = 'manual',
      category_confidence = 1,
      manual_locks = manual_locks || jsonb_build_object('category', true)
  where id = tx.id and user_id = u;

  insert into public.review_items (user_id, transaction_id, type, status, detail, resolved_at)
  values (u, tx.id, 'category', 'resolved', jsonb_build_object('reason', 'manual_category_edit', 'category_id', category.id), now())
  on conflict (user_id, transaction_id, type) do update
  set status = 'resolved', detail = excluded.detail, resolved_at = now(), updated_at = now();

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'transaction', tx.id, 'category_set_manually', jsonb_build_object(
    'before_category_id', tx.category_id,
    'after_category_id', category.id,
    'cleared_subcategory_id', tx.subcategory_id
  ));
end;
$$;

revoke all on function public.set_transaction_category_manual(uuid, uuid) from public;
grant execute on function public.set_transaction_category_manual(uuid, uuid) to authenticated;
