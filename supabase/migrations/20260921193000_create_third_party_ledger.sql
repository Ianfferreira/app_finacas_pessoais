-- Stage 7: people, exact splits, and an auditable third-party ledger.
create type public.third_party_entry_kind as enum ('charge', 'reimbursement', 'settlement', 'adjustment');

create table public.person_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null,
  normalized_alias text not null check (char_length(trim(normalized_alias)) between 1 and 160),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, normalized_alias),
  foreign key (person_id, user_id) references public.people(id, user_id) on delete cascade
);

create table public.third_party_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null,
  transaction_id uuid null,
  kind public.third_party_entry_kind not null,
  -- Positive: the person owes the user. Negative: user owes/holds their credit.
  amount numeric(18, 2) not null check (amount <> 0),
  occurred_on date not null default current_date,
  note text null check (note is null or char_length(trim(note)) <= 1000),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (person_id, user_id) references public.people(id, user_id) on delete restrict,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete restrict
);
create index third_party_entries_person_idx on public.third_party_entries (user_id, person_id, occurred_on, created_at);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null,
  transaction_id uuid null,
  amount numeric(18, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  note text null check (note is null or char_length(trim(note)) <= 1000),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (person_id, user_id) references public.people(id, user_id) on delete restrict,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete restrict
);

create table public.settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  settlement_id uuid not null,
  third_party_entry_id uuid not null,
  amount numeric(18, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, settlement_id, third_party_entry_id),
  foreign key (settlement_id, user_id) references public.settlements(id, user_id) on delete cascade,
  foreign key (third_party_entry_id, user_id) references public.third_party_entries(id, user_id) on delete restrict
);

create table public.installment_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_id uuid not null,
  owner_type public.owner_type not null,
  person_id uuid null,
  amount numeric(18, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, installment_id, owner_type, person_id),
  check ((owner_type = 'self' and person_id is null) or (owner_type = 'third_party' and person_id is not null)),
  foreign key (installment_id, user_id) references public.installments(id, user_id) on delete cascade,
  foreign key (person_id, user_id) references public.people(id, user_id) on delete restrict
);

create function public.assert_settlement_allocation_total(target_settlement_id uuid, target_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare expected numeric(18,2); allocated numeric(18,2);
begin
  select amount into expected from public.settlements where id = target_settlement_id and user_id = target_user_id;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into allocated from public.settlement_allocations where settlement_id = target_settlement_id and user_id = target_user_id;
  if expected <> allocated then raise exception 'settlement allocation total (%) must equal settlement amount (%)', allocated, expected using errcode = '23514'; end if;
end;
$$;
create function public.assert_settlement_allocation_trigger()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform public.assert_settlement_allocation_total(coalesce(new.settlement_id, old.settlement_id), coalesce(new.user_id, old.user_id));
  return null;
end;
$$;
create function public.assert_settlement_total_trigger()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform public.assert_settlement_allocation_total(new.id, new.user_id);
  return null;
end;
$$;
create constraint trigger settlement_allocations_total_matches_settlement
after insert or update or delete on public.settlement_allocations
deferrable initially deferred for each row execute procedure public.assert_settlement_allocation_trigger();
create constraint trigger settlement_total_matches_allocations
after insert or update of amount on public.settlements
deferrable initially deferred for each row execute procedure public.assert_settlement_total_trigger();

create function public.assert_installment_allocation_total(target_installment_id uuid, target_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare expected numeric(18,2); allocated numeric(18,2);
begin
  select amount into expected from public.installments where id = target_installment_id and user_id = target_user_id;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into allocated from public.installment_allocations where installment_id = target_installment_id and user_id = target_user_id;
  if allocated <> 0 and expected <> allocated then raise exception 'installment allocation total (%) must equal installment amount (%)', allocated, expected using errcode = '23514'; end if;
end;
$$;
create function public.assert_installment_allocation_trigger()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform public.assert_installment_allocation_total(coalesce(new.installment_id, old.installment_id), coalesce(new.user_id, old.user_id));
  return null;
end;
$$;
create constraint trigger installment_allocations_total_matches_installment
after insert or update or delete on public.installment_allocations
deferrable initially deferred for each row execute procedure public.assert_installment_allocation_trigger();

revoke all on function public.assert_settlement_allocation_total(uuid, uuid) from public;
revoke all on function public.assert_settlement_allocation_trigger() from public;
revoke all on function public.assert_settlement_total_trigger() from public;
revoke all on function public.assert_installment_allocation_total(uuid, uuid) from public;
revoke all on function public.assert_installment_allocation_trigger() from public;

do $$
declare table_name text;
begin
  foreach table_name in array array['person_aliases','third_party_entries','settlements','settlement_allocations','installment_allocations'] loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end;
$$;
