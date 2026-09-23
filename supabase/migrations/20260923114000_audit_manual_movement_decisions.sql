-- P0: direct edits made from Movements use the same auditable, user-scoped
-- routines as the review queue. No UI path may silently change interpretation.
create function public.set_transaction_nature_manual(
  p_transaction_id uuid,
  p_nature public.economic_nature
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  previous_nature public.economic_nature;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select nature into previous_nature
  from public.transactions
  where id = p_transaction_id and user_id = u
  for update;
  if not found then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;

  update public.transactions
  set nature = p_nature,
      nature_source = 'manual',
      nature_confidence = 1,
      manual_locks = manual_locks || jsonb_build_object('nature', true)
  where id = p_transaction_id and user_id = u;

  insert into public.review_items (user_id, transaction_id, type, status, detail, resolved_at)
  values (u, p_transaction_id, 'nature', 'resolved', jsonb_build_object('reason', 'manual_movement_edit'), now())
  on conflict (user_id, transaction_id, type) do update
  set status = 'resolved', detail = excluded.detail, resolved_at = now(), updated_at = now();

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'transaction', p_transaction_id, 'nature_set_manually', jsonb_build_object(
    'before', previous_nature,
    'after', p_nature,
    'surface', 'movements'
  ));
end;
$$;

create function public.create_confirmed_transaction_link(
  p_from_transaction_id uuid,
  p_to_transaction_id uuid,
  p_link_type public.link_type,
  p_amount numeric(18, 2)
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  link_id uuid;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_from_transaction_id = p_to_transaction_id or p_amount < 0 then
    raise exception 'invalid transaction link' using errcode = '22023';
  end if;
  if not exists (select 1 from public.transactions where id = p_from_transaction_id and user_id = u)
    or not exists (select 1 from public.transactions where id = p_to_transaction_id and user_id = u) then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;

  insert into public.transaction_links (
    user_id, from_transaction_id, to_transaction_id, link_type, amount, status, confirmed_by_user
  ) values (
    u, p_from_transaction_id, p_to_transaction_id, p_link_type, p_amount, 'confirmed', true
  ) returning id into link_id;

  insert into public.review_items (user_id, transaction_id, type, status, detail, resolved_at)
  values (u, p_from_transaction_id, 'reconciliation', 'resolved', jsonb_build_object('link_id', link_id), now())
  on conflict (user_id, transaction_id, type) do update
  set status = 'resolved', detail = excluded.detail, resolved_at = now(), updated_at = now();

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'transaction_link', link_id, 'transaction_link_confirmed', jsonb_build_object(
    'from_transaction_id', p_from_transaction_id,
    'to_transaction_id', p_to_transaction_id,
    'link_type', p_link_type,
    'amount', p_amount,
    'surface', 'movements'
  ));
  return link_id;
end;
$$;

revoke all on function public.set_transaction_nature_manual(uuid, public.economic_nature) from public;
grant execute on function public.set_transaction_nature_manual(uuid, public.economic_nature) to authenticated;
revoke all on function public.create_confirmed_transaction_link(uuid, uuid, public.link_type, numeric) from public;
grant execute on function public.create_confirmed_transaction_link(uuid, uuid, public.link_type, numeric) to authenticated;
