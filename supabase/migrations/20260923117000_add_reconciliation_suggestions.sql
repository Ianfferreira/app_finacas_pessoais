-- P0: reconciliation suggestions are evidence for review, never an automatic
-- financial classification or a confirmed transaction link.
create type public.reconciliation_candidate_status as enum (
  'suggested',
  'confirmed',
  'dismissed'
);

create table public.reconciliation_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_transaction_id uuid not null,
  to_transaction_id uuid not null,
  link_type public.link_type not null,
  amount numeric(18, 2) not null check (amount >= 0),
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  evidence jsonb not null,
  status public.reconciliation_candidate_status not null default 'suggested',
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  unique (id, user_id),
  unique (user_id, from_transaction_id, to_transaction_id, link_type),
  check (from_transaction_id <> to_transaction_id),
  check ((status = 'suggested' and resolved_at is null) or status <> 'suggested'),
  foreign key (from_transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict,
  foreign key (to_transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict
);

create index reconciliation_candidates_open_idx
  on public.reconciliation_candidates (user_id, status, created_at);
create index reconciliation_candidates_transaction_idx
  on public.reconciliation_candidates (user_id, from_transaction_id, to_transaction_id);

-- A reconciliation review is independent from category, ownership and nature.
-- It stays open while at least one suggestion involving the movement remains.
create function public.sync_reconciliation_review_for_transaction(
  p_user_id uuid,
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_count integer;
begin
  select count(*) into candidate_count
  from public.reconciliation_candidates
  where user_id = p_user_id
    and status = 'suggested'
    and (from_transaction_id = p_transaction_id or to_transaction_id = p_transaction_id);

  if candidate_count > 0 then
    insert into public.review_items (user_id, transaction_id, type, status, detail)
    values (
      p_user_id,
      p_transaction_id,
      'reconciliation',
      'open',
      jsonb_build_object(
        'reason', 'reconciliation_suggestions',
        'candidate_count', candidate_count
      )
    )
    on conflict (user_id, transaction_id, type) do update
    set status = 'open',
        detail = excluded.detail,
        resolved_at = null,
        updated_at = now();
  else
    -- Do not close a reconciliation task created for another reason. This
    -- routine owns only the review entries it opened itself.
    update public.review_items
    set status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    where user_id = p_user_id
      and transaction_id = p_transaction_id
      and type = 'reconciliation'
      and detail ->> 'reason' = 'reconciliation_suggestions';
  end if;
end;
$$;

-- Rebuild one movement's open suggestions. It is callable after an import or
-- after an explicit user interpretation, and is idempotent for that movement.
create function public.refresh_transaction_reconciliation_candidates(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  tx public.transactions%rowtype;
  stale public.reconciliation_candidates%rowtype;
  affected_ids uuid[] := array[p_transaction_id];
  affected_id uuid;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into tx
  from public.transactions
  where id = p_transaction_id and user_id = u
  for update;
  if not found then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;

  -- Only replace still-open suggestions. A user dismissal or confirmation is
  -- historical evidence and is never silently reopened by reprocessing.
  for stale in
    delete from public.reconciliation_candidates
    where user_id = u
      and status = 'suggested'
      and (from_transaction_id = tx.id or to_transaction_id = tx.id)
    returning *
  loop
    affected_ids := array_append(affected_ids, stale.from_transaction_id);
    affected_ids := array_append(affected_ids, stale.to_transaction_id);
  end loop;

  if not tx.is_void and tx.occurred_on is not null then
    -- A transfer candidate requires two different accounts explicitly marked
    -- as own, opposite directions, the exact amount/currency and the same
    -- business date. It does not classify either movement as a transfer.
    insert into public.reconciliation_candidates (
      user_id,
      from_transaction_id,
      to_transaction_id,
      link_type,
      amount,
      confidence,
      evidence
    )
    select
      u,
      case when tx.direction = 'outflow' then tx.id else other.id end,
      case when tx.direction = 'inflow' then tx.id else other.id end,
      'own_transfer_pair',
      tx.amount,
      0.9500,
      jsonb_build_object(
        'strategy', 'own_transfer_exact_amount_same_date',
        'matched_fields', jsonb_build_array('own_accounts', 'opposite_direction', 'amount', 'currency', 'occurred_on'),
        'occurred_on', tx.occurred_on,
        'amount', tx.amount,
        'currency', tx.currency
      )
    from public.transactions other
    join public.accounts tx_account
      on tx_account.id = tx.account_id and tx_account.user_id = u
    join public.accounts other_account
      on other_account.id = other.account_id and other_account.user_id = u
    where tx.nature = 'own_transfer'
      and other.user_id = u
      and other.id <> tx.id
      and not other.is_void
      and other.nature = 'own_transfer'
      and tx.account_id is not null
      and other.account_id is not null
      and tx_account.is_own
      and other_account.is_own
      and tx.account_id <> other.account_id
      and other.direction <> tx.direction
      and other.direction in ('inflow', 'outflow')
      and tx.direction in ('inflow', 'outflow')
      and other.amount = tx.amount
      and other.currency = tx.currency
      and other.occurred_on = tx.occurred_on
      and not exists (
        select 1
        from public.transaction_links link
        where link.user_id = u
          and link.link_type = 'own_transfer_pair'
          and link.status = 'confirmed'
          and link.from_transaction_id = case when tx.direction = 'outflow' then tx.id else other.id end
          and link.to_transaction_id = case when tx.direction = 'inflow' then tx.id else other.id end
      )
    on conflict (user_id, from_transaction_id, to_transaction_id, link_type) do nothing;

    -- An exact reversal candidate is scoped to the same account or card and
    -- preserves the original expense -> reversal direction in the suggested
    -- link. Multiple exact matches remain visible as ambiguity for review.
    insert into public.reconciliation_candidates (
      user_id,
      from_transaction_id,
      to_transaction_id,
      link_type,
      amount,
      confidence,
      evidence
    )
    select
      u,
      case when tx.nature = 'expense' then tx.id else other.id end,
      case when tx.nature = 'reversal' then tx.id else other.id end,
      'reversal_of',
      tx.amount,
      0.9000,
      jsonb_build_object(
        'strategy', 'reversal_exact_amount_same_source_scope',
        'matched_fields', jsonb_build_array('amount', 'currency', 'source_scope', 'chronology'),
        'source_scope', case when tx.card_id is not null then 'card' else 'account' end,
        'amount', tx.amount,
        'currency', tx.currency
      )
    from public.transactions other
    where tx.nature in ('expense', 'reversal')
      and other.user_id = u
      and other.id <> tx.id
      and not other.is_void
      and ((tx.nature = 'expense' and other.nature = 'reversal') or (tx.nature = 'reversal' and other.nature = 'expense'))
      and tx.amount = other.amount
      and tx.currency = other.currency
      and ((tx.card_id is not null and tx.card_id = other.card_id) or (tx.account_id is not null and tx.account_id = other.account_id))
      and ((tx.nature = 'expense' and tx.direction = 'outflow' and other.direction in ('inflow', 'neutral') and tx.occurred_on <= other.occurred_on)
        or (tx.nature = 'reversal' and tx.direction in ('inflow', 'neutral') and other.direction = 'outflow' and other.occurred_on <= tx.occurred_on))
      and not exists (
        select 1
        from public.transaction_links link
        where link.user_id = u
          and link.link_type = 'reversal_of'
          and link.status = 'confirmed'
          and link.from_transaction_id = case when tx.nature = 'expense' then tx.id else other.id end
          and link.to_transaction_id = case when tx.nature = 'reversal' then tx.id else other.id end
      )
    on conflict (user_id, from_transaction_id, to_transaction_id, link_type) do nothing;
  end if;

  for affected_id in
    select distinct candidate_id
    from (
      select unnest(affected_ids) as candidate_id
      union
      select from_transaction_id
      from public.reconciliation_candidates
      where user_id = u and status = 'suggested'
        and (from_transaction_id = tx.id or to_transaction_id = tx.id)
      union
      select to_transaction_id
      from public.reconciliation_candidates
      where user_id = u and status = 'suggested'
        and (from_transaction_id = tx.id or to_transaction_id = tx.id)
    ) as affected
  loop
    perform public.sync_reconciliation_review_for_transaction(u, affected_id);
  end loop;
end;
$$;

create function public.refresh_transaction_reconciliation_candidates_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.user_id = auth.uid() then
    perform public.refresh_transaction_reconciliation_candidates(new.id);
  end if;
  return new;
end;
$$;

create trigger transactions_refresh_reconciliation_candidates
after insert or update of nature, direction, account_id, card_id, occurred_on, amount, currency, is_void
on public.transactions
for each row execute procedure public.refresh_transaction_reconciliation_candidates_after_change();

create function public.dismiss_reconciliation_candidate(p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  candidate public.reconciliation_candidates%rowtype;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into candidate
  from public.reconciliation_candidates
  where id = p_candidate_id and user_id = u
  for update;
  if not found then
    raise exception 'reconciliation candidate not found' using errcode = 'P0002';
  end if;
  if candidate.status <> 'suggested' then
    raise exception 'reconciliation candidate is already resolved' using errcode = '22023';
  end if;

  update public.reconciliation_candidates
  set status = 'dismissed', resolved_at = now()
  where id = candidate.id and user_id = u;

  perform public.sync_reconciliation_review_for_transaction(u, candidate.from_transaction_id);
  perform public.sync_reconciliation_review_for_transaction(u, candidate.to_transaction_id);

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'reconciliation_candidate', candidate.id, 'reconciliation_candidate_dismissed', jsonb_build_object(
    'from_transaction_id', candidate.from_transaction_id,
    'to_transaction_id', candidate.to_transaction_id,
    'link_type', candidate.link_type,
    'amount', candidate.amount
  ));
end;
$$;

create function public.confirm_reconciliation_candidates_for_link(
  p_user_id uuid,
  p_from_transaction_id uuid,
  p_to_transaction_id uuid,
  p_link_type public.link_type
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.reconciliation_candidates
  set status = 'confirmed', resolved_at = now()
  where user_id = p_user_id
    and status = 'suggested'
    and from_transaction_id = p_from_transaction_id
    and to_transaction_id = p_to_transaction_id
    and link_type = p_link_type;
end;
$$;

-- Confirming an existing candidate is still an explicit user action. Extend
-- the existing link routine so the candidate history and both review entries
-- reflect that decision without changing the financial interpretation itself.
create or replace function public.create_confirmed_transaction_link(
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

  perform public.confirm_reconciliation_candidates_for_link(
    u,
    p_from_transaction_id,
    p_to_transaction_id,
    p_link_type
  );

  insert into public.review_items (user_id, transaction_id, type, status, detail, resolved_at)
  values
    (u, p_from_transaction_id, 'reconciliation', 'resolved', jsonb_build_object('reason', 'confirmed_transaction_link', 'link_id', link_id), now()),
    (u, p_to_transaction_id, 'reconciliation', 'resolved', jsonb_build_object('reason', 'confirmed_transaction_link', 'link_id', link_id), now())
  on conflict (user_id, transaction_id, type) do update
  set status = 'resolved', detail = excluded.detail, resolved_at = now(), updated_at = now();

  perform public.sync_reconciliation_review_for_transaction(u, p_from_transaction_id);
  perform public.sync_reconciliation_review_for_transaction(u, p_to_transaction_id);

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

revoke all on function public.sync_reconciliation_review_for_transaction(uuid, uuid) from public;
revoke all on function public.refresh_transaction_reconciliation_candidates_after_change() from public;
revoke all on function public.confirm_reconciliation_candidates_for_link(uuid, uuid, uuid, public.link_type) from public;
revoke all on function public.refresh_transaction_reconciliation_candidates(uuid) from public;
grant execute on function public.refresh_transaction_reconciliation_candidates(uuid) to authenticated;
revoke all on function public.dismiss_reconciliation_candidate(uuid) from public;
grant execute on function public.dismiss_reconciliation_candidate(uuid) to authenticated;
revoke all on function public.create_confirmed_transaction_link(uuid, uuid, public.link_type, numeric) from public;
grant execute on function public.create_confirmed_transaction_link(uuid, uuid, public.link_type, numeric) to authenticated;

revoke all on table public.reconciliation_candidates from anon, authenticated;
grant select on table public.reconciliation_candidates to authenticated;
alter table public.reconciliation_candidates enable row level security;
alter table public.reconciliation_candidates force row level security;
create policy reconciliation_candidates_select_own
  on public.reconciliation_candidates for select to authenticated
  using ((select auth.uid()) = user_id);
