create type public.link_type as enum (
  'reversal_of',
  'pays_statement',
  'own_transfer_pair',
  'settles_third_party',
  'duplicate_of',
  'related'
);

create table public.transaction_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_transaction_id uuid not null,
  to_transaction_id uuid not null,
  link_type public.link_type not null,
  amount numeric(18, 2) not null check (amount >= 0),
  status public.review_status not null default 'pending',
  confirmed_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, from_transaction_id, to_transaction_id, link_type),
  check (from_transaction_id <> to_transaction_id),
  foreign key (from_transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict,
  foreign key (to_transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict
);

create index transaction_links_user_from_idx
  on public.transaction_links (user_id, from_transaction_id);
create index transaction_links_user_to_idx
  on public.transaction_links (user_id, to_transaction_id);

revoke all on table public.transaction_links from anon;
grant select, insert, update, delete on public.transaction_links to authenticated;

alter table public.transaction_links enable row level security;
alter table public.transaction_links force row level security;

create policy "transaction_links_select_own"
on public.transaction_links for select to authenticated
using ((select auth.uid()) = user_id);

create policy "transaction_links_insert_own"
on public.transaction_links for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "transaction_links_update_own"
on public.transaction_links for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "transaction_links_delete_own"
on public.transaction_links for delete to authenticated
using ((select auth.uid()) = user_id);
