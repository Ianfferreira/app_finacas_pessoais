-- P0: distinct files with the same deterministic transaction fingerprint are
-- never merged automatically. They become a reviewable candidate pair.
create type public.duplicate_candidate_status as enum ('pending', 'confirmed', 'dismissed');

create table public.possible_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  candidate_transaction_id uuid not null,
  status public.duplicate_candidate_status not null default 'pending',
  fingerprint jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  unique (id, user_id),
  unique (user_id, transaction_id, candidate_transaction_id),
  check (transaction_id <> candidate_transaction_id),
  check ((status = 'pending' and resolved_at is null) or status <> 'pending'),
  foreign key (transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict,
  foreign key (candidate_transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict
);

create index possible_duplicate_candidates_open_idx
  on public.possible_duplicate_candidates (user_id, status, created_at);
create index possible_duplicate_candidates_transaction_idx
  on public.possible_duplicate_candidates (user_id, transaction_id, candidate_transaction_id);

create function public.detect_possible_transaction_duplicates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
begin
  -- The importing RPC is authenticated. A direct insertion without an
  -- authenticated user is not a supported write path and must not create a
  -- cross-user candidate.
  if u is null or new.user_id <> u or new.is_void or new.occurred_on is null then
    return new;
  end if;
  if new.card_id is null and new.account_id is null then
    return new;
  end if;

  insert into public.possible_duplicate_candidates (
    user_id, transaction_id, candidate_transaction_id, fingerprint
  )
  select
    u,
    new.id,
    existing.id,
    jsonb_build_object(
      'source_scope', case when new.card_id is not null then 'card' else 'account' end,
      'occurred_on', new.occurred_on,
      'amount', new.amount,
      'currency', new.currency,
      'description_normalized', new.description_normalized,
      'direction', new.direction,
      'nature', new.nature,
      'competence_month', new.competence_month
    )
  from public.transactions existing
  where existing.user_id = u
    and existing.id <> new.id
    -- A multi-row INSERT may expose sibling rows to each AFTER trigger. Keep
    -- one canonical pair regardless of trigger execution order.
    and existing.id < new.id
    and existing.import_id <> new.import_id
    and not existing.is_void
    and existing.occurred_on = new.occurred_on
    and existing.amount = new.amount
    and existing.currency = new.currency
    and existing.description_normalized = new.description_normalized
    and existing.direction = new.direction
    and existing.nature = new.nature
    and existing.competence_month = new.competence_month
    and existing.card_id is not distinct from new.card_id
    and existing.account_id is not distinct from new.account_id
  on conflict (user_id, transaction_id, candidate_transaction_id) do nothing;

  insert into public.review_items (user_id, transaction_id, type, status, detail)
  select
    u,
    pending_transaction.id,
    'possible_duplicate',
    'open',
    jsonb_build_object('reason', 'matching_cross_file_fingerprint')
  from (
    select transaction_id as id
    from public.possible_duplicate_candidates
    where user_id = u and transaction_id = new.id and status = 'pending'
    union
    select candidate_transaction_id as id
    from public.possible_duplicate_candidates
    where user_id = u and transaction_id = new.id and status = 'pending'
  ) pending_transaction
  on conflict (user_id, transaction_id, type) do update
  set status = 'open',
      detail = excluded.detail,
      resolved_at = null,
      updated_at = now();

  return new;
end;
$$;

create trigger transactions_detect_possible_duplicates
after insert on public.transactions
for each row execute procedure public.detect_possible_transaction_duplicates();

revoke all on function public.detect_possible_transaction_duplicates() from public;
revoke all on table public.possible_duplicate_candidates from anon;
grant select, insert, update, delete on table public.possible_duplicate_candidates to authenticated;
alter table public.possible_duplicate_candidates enable row level security;
alter table public.possible_duplicate_candidates force row level security;
create policy possible_duplicate_candidates_select_own
  on public.possible_duplicate_candidates for select to authenticated
  using ((select auth.uid()) = user_id);
create policy possible_duplicate_candidates_insert_own
  on public.possible_duplicate_candidates for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy possible_duplicate_candidates_update_own
  on public.possible_duplicate_candidates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy possible_duplicate_candidates_delete_own
  on public.possible_duplicate_candidates for delete to authenticated
  using ((select auth.uid()) = user_id);
