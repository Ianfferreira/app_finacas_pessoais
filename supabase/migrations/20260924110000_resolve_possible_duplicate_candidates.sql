-- P0: a possible duplicate is never removed by detection. Only an explicit
-- user decision can mark one interpretation as void while retaining all raw
-- evidence, the candidate and an auditable canonical link.
create function public.sync_possible_duplicate_review_for_transaction(
  p_user_id uuid,
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_count integer;
begin
  select count(*) into pending_count
  from public.possible_duplicate_candidates
  where user_id = p_user_id
    and status = 'pending'
    and (transaction_id = p_transaction_id or candidate_transaction_id = p_transaction_id);

  if pending_count > 0 then
    insert into public.review_items (user_id, transaction_id, type, status, detail)
    values (
      p_user_id,
      p_transaction_id,
      'possible_duplicate',
      'open',
      jsonb_build_object('reason', 'possible_duplicate_candidates', 'candidate_count', pending_count)
    )
    on conflict (user_id, transaction_id, type) do update
    set status = 'open',
        detail = excluded.detail,
        resolved_at = null,
        updated_at = now();
  else
    update public.review_items
    set status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    where user_id = p_user_id
      and transaction_id = p_transaction_id
      and type = 'possible_duplicate'
      and status = 'open';
  end if;
end;
$$;

create function public.dismiss_possible_duplicate_candidate(
  p_candidate_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  candidate public.possible_duplicate_candidates%rowtype;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into candidate
  from public.possible_duplicate_candidates
  where id = p_candidate_id and user_id = u
  for update;
  if not found then
    raise exception 'possible duplicate candidate not found' using errcode = 'P0002';
  end if;
  if candidate.status <> 'pending' then
    raise exception 'possible duplicate candidate is already resolved' using errcode = '22023';
  end if;

  update public.possible_duplicate_candidates
  set status = 'dismissed', resolved_at = now()
  where id = candidate.id and user_id = u;

  perform public.sync_possible_duplicate_review_for_transaction(u, candidate.transaction_id);
  perform public.sync_possible_duplicate_review_for_transaction(u, candidate.candidate_transaction_id);

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'possible_duplicate_candidate', candidate.id, 'possible_duplicate_dismissed', jsonb_build_object(
    'transaction_id', candidate.transaction_id,
    'candidate_transaction_id', candidate.candidate_transaction_id
  ));
end;
$$;

create function public.confirm_possible_duplicate_candidate(
  p_candidate_id uuid,
  p_canonical_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  candidate public.possible_duplicate_candidates%rowtype;
  canonical public.transactions%rowtype;
  redundant public.transactions%rowtype;
  link_id uuid;
  affected_id uuid;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into candidate
  from public.possible_duplicate_candidates
  where id = p_candidate_id and user_id = u
  for update;
  if not found then
    raise exception 'possible duplicate candidate not found' using errcode = 'P0002';
  end if;
  if candidate.status <> 'pending' then
    raise exception 'possible duplicate candidate is already resolved' using errcode = '22023';
  end if;
  if p_canonical_transaction_id not in (candidate.transaction_id, candidate.candidate_transaction_id) then
    raise exception 'canonical transaction must belong to the candidate pair' using errcode = '22023';
  end if;

  select * into canonical
  from public.transactions
  where id = p_canonical_transaction_id and user_id = u
  for update;
  if not found or canonical.is_void then
    raise exception 'canonical transaction is unavailable' using errcode = '22023';
  end if;

  select * into redundant
  from public.transactions
  where id = case
    when candidate.transaction_id = canonical.id then candidate.candidate_transaction_id
    else candidate.transaction_id
  end
  and user_id = u
  for update;
  if not found or redundant.is_void then
    raise exception 'duplicate transaction is unavailable' using errcode = '22023';
  end if;

  insert into public.transaction_links (
    user_id, from_transaction_id, to_transaction_id, link_type, amount, status, confirmed_by_user
  ) values (
    u, redundant.id, canonical.id, 'duplicate_of', redundant.amount, 'confirmed', true
  ) returning id into link_id;

  update public.transactions
  set is_void = true
  where id = redundant.id and user_id = u;

  update public.possible_duplicate_candidates
  set status = 'confirmed', resolved_at = now()
  where id = candidate.id and user_id = u;

  -- A voided interpretation cannot keep unrelated duplicate questions open.
  -- The other candidates remain in history as dismissed, never deleted.
  update public.possible_duplicate_candidates
  set status = 'dismissed', resolved_at = now()
  where user_id = u
    and status = 'pending'
    and id <> candidate.id
    and (transaction_id = redundant.id or candidate_transaction_id = redundant.id);

  for affected_id in
    select distinct transaction_id
    from (
      select transaction_id from public.possible_duplicate_candidates
      where user_id = u and (transaction_id = redundant.id or candidate_transaction_id = redundant.id)
      union
      select candidate_transaction_id from public.possible_duplicate_candidates
      where user_id = u and (transaction_id = redundant.id or candidate_transaction_id = redundant.id)
      union
      select canonical.id
    ) as affected
  loop
    perform public.sync_possible_duplicate_review_for_transaction(u, affected_id);
  end loop;

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'possible_duplicate_candidate', candidate.id, 'possible_duplicate_confirmed', jsonb_build_object(
    'canonical_transaction_id', canonical.id,
    'voided_transaction_id', redundant.id,
    'transaction_link_id', link_id,
    'amount', redundant.amount
  ));
  return link_id;
end;
$$;

revoke all on function public.sync_possible_duplicate_review_for_transaction(uuid, uuid) from public;
revoke all on function public.dismiss_possible_duplicate_candidate(uuid) from public;
grant execute on function public.dismiss_possible_duplicate_candidate(uuid) to authenticated;
revoke all on function public.confirm_possible_duplicate_candidate(uuid, uuid) from public;
grant execute on function public.confirm_possible_duplicate_candidate(uuid, uuid) to authenticated;
