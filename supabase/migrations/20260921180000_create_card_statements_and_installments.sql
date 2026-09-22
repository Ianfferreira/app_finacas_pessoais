create type public.card_statement_status as enum (
  'processing',
  'processed',
  'partial',
  'failed'
);

create type public.installment_group_status as enum (
  'active',
  'completed',
  'cancelled'
);

create type public.installment_status as enum ('scheduled', 'realized', 'void');

insert into public.institutions (code, name)
values
  ('CAIXA', 'Cartões Caixa'),
  ('INTER', 'Banco Inter'),
  ('RICO_XP', 'Rico/XP')
on conflict (code) do nothing;

create table public.card_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null,
  card_id uuid not null,
  cycle_start date null,
  cycle_end date null,
  due_on date null,
  total_due numeric(18, 2) null check (total_due >= 0),
  status public.card_statement_status not null default 'processing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, import_id, card_id),
  check (cycle_end is null or cycle_start is null or cycle_end >= cycle_start),
  foreign key (import_id, user_id)
    references public.imports(id, user_id) on delete restrict,
  foreign key (card_id, user_id)
    references public.cards(id, user_id) on delete restrict
);

create table public.installment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid null,
  source_group_key text not null check (char_length(trim(source_group_key)) between 1 and 255),
  description text not null check (char_length(trim(description)) between 1 and 2000),
  purchase_date date null,
  original_amount numeric(18, 2) null check (original_amount >= 0),
  total_installments smallint not null check (total_installments between 2 and 360),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  source_confidence numeric(5, 4) not null default 1 check (source_confidence between 0 and 1),
  status public.installment_group_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, source_group_key),
  foreign key (card_id, user_id)
    references public.cards(id, user_id) on delete restrict
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_group_id uuid not null,
  transaction_id uuid null,
  installment_number smallint not null check (installment_number between 1 and 360),
  competence_month date not null check (competence_month = date_trunc('month', competence_month)::date),
  amount numeric(18, 2) not null check (amount >= 0),
  status public.installment_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, installment_group_id, installment_number),
  unique (transaction_id),
  foreign key (installment_group_id, user_id)
    references public.installment_groups(id, user_id) on delete restrict,
  foreign key (transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict
);

create index card_statements_user_cycle_end_idx
  on public.card_statements (user_id, cycle_end);
create index installments_user_competence_idx
  on public.installments (user_id, competence_month);
create index installments_user_group_idx
  on public.installments (user_id, installment_group_id);

create trigger card_statements_set_updated_at
before update on public.card_statements
for each row execute procedure public.set_updated_at();
create trigger installment_groups_set_updated_at
before update on public.installment_groups
for each row execute procedure public.set_updated_at();
create trigger installments_set_updated_at
before update on public.installments
for each row execute procedure public.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'card_statements', 'installment_groups', 'installments'
  ]
  loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end;
$$;
