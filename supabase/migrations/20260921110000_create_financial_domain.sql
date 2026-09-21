-- Stage 2: auditable financial-domain foundation.
-- Files and raw records are evidence; transactions and allocations are the
-- editable economic interpretation. Import/upload processing arrives later.

create type public.account_type as enum (
  'checking', 'savings', 'payment', 'cash', 'investment', 'other'
);
create type public.category_kind as enum ('expense', 'income');
create type public.source_kind as enum ('bank_statement', 'card_statement', 'other');
create type public.file_format as enum ('csv', 'pdf');
create type public.import_status as enum (
  'uploaded', 'identified', 'processing', 'processed', 'partial', 'failed', 'duplicate'
);
create type public.parse_status as enum ('pending', 'parsed', 'ignored', 'failed');
create type public.transaction_direction as enum ('inflow', 'outflow', 'neutral');
create type public.economic_nature as enum (
  'income', 'expense', 'own_transfer', 'card_payment', 'investment',
  'redemption', 'refund', 'third_party', 'loan_given', 'loan_received',
  'loan_repayment', 'reversal', 'investment_income', 'adjustment', 'unclassified'
);
create type public.review_status as enum (
  'pending', 'suggested', 'confirmed', 'not_required'
);
create type public.decision_source as enum (
  'manual', 'user_rule', 'merchant_mapping', 'global_rule', 'parser',
  'heuristic', 'ai_suggestion', 'unknown'
);
create type public.owner_type as enum ('self', 'third_party');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  country text not null default 'BR' check (country ~ '^[A-Z]{2}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  kind public.category_kind not null,
  color text null check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system_seed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, kind, name)
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, category_id, name),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete restrict
);

-- The documented V1 taxonomy is created for every profile, including profiles
-- that pre-date this migration. It is user-owned and remains editable.
create function public.seed_default_categories(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, kind, sort_order, is_system_seed)
  values
    (target_user_id, 'Moradia', 'expense', 10, true),
    (target_user_id, 'Alimentação', 'expense', 20, true),
    (target_user_id, 'Transporte', 'expense', 30, true),
    (target_user_id, 'Saúde & Bem-estar', 'expense', 40, true),
    (target_user_id, 'Educação', 'expense', 50, true),
    (target_user_id, 'Lazer & Viagens', 'expense', 60, true),
    (target_user_id, 'Compras & Pessoal', 'expense', 70, true),
    (target_user_id, 'Serviços & Assinaturas', 'expense', 80, true),
    (target_user_id, 'Outros', 'expense', 90, true),
    (target_user_id, 'Salário', 'income', 10, true),
    (target_user_id, 'Bolsa', 'income', 20, true),
    (target_user_id, 'Trabalho/renda extra', 'income', 30, true),
    (target_user_id, 'Mesada', 'income', 40, true),
    (target_user_id, 'Rendimentos', 'income', 50, true),
    (target_user_id, 'Presente', 'income', 60, true),
    (target_user_id, 'Outras receitas', 'income', 70, true)
  on conflict (user_id, kind, name) do nothing;

  insert into public.subcategories (user_id, category_id, name, sort_order)
  select target_user_id, category.id, seed.name, seed.sort_order
  from (
    values
      ('Moradia', 'Aluguel/condomínio', 10), ('Moradia', 'Contas da casa', 20),
      ('Moradia', 'Manutenção', 30), ('Moradia', 'Móveis', 40), ('Moradia', 'Construção', 50),
      ('Alimentação', 'Mercado', 10), ('Alimentação', 'Restaurante', 20),
      ('Alimentação', 'Delivery', 30), ('Alimentação', 'Café/lanche', 40),
      ('Transporte', 'Aplicativo', 10), ('Transporte', 'Transporte público', 20),
      ('Transporte', 'Combustível', 30), ('Transporte', 'Estacionamento', 40),
      ('Transporte', 'Manutenção', 50), ('Saúde & Bem-estar', 'Farmácia', 10),
      ('Saúde & Bem-estar', 'Consultas', 20), ('Saúde & Bem-estar', 'Plano de saúde', 30),
      ('Saúde & Bem-estar', 'Academia/fitness', 40), ('Saúde & Bem-estar', 'Ótica', 50),
      ('Educação', 'Cursos', 10), ('Educação', 'Materiais', 20), ('Educação', 'Livros', 30),
      ('Lazer & Viagens', 'Lazer', 10), ('Lazer & Viagens', 'Viagens', 20),
      ('Lazer & Viagens', 'Eventos', 30), ('Compras & Pessoal', 'Vestuário', 10),
      ('Compras & Pessoal', 'Beleza', 20), ('Compras & Pessoal', 'Eletrônicos', 30),
      ('Compras & Pessoal', 'Presentes', 40), ('Serviços & Assinaturas', 'Telefonia', 10),
      ('Serviços & Assinaturas', 'Streaming', 20), ('Serviços & Assinaturas', 'Software', 30),
      ('Serviços & Assinaturas', 'Clubes/assinaturas', 40), ('Serviços & Assinaturas', 'Serviços profissionais', 50)
  ) as seed(category_name, name, sort_order)
  join public.categories as category
    on category.user_id = target_user_id
    and category.name = seed.category_name
    and category.kind = 'expense'
  on conflict (user_id, category_id, name) do nothing;
end;
$$;

create function public.seed_categories_for_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_categories(new.user_id);
  return new;
end;
$$;

create trigger profiles_seed_default_categories
after insert on public.profiles
for each row execute procedure public.seed_categories_for_new_profile();

select public.seed_default_categories(user_id) from public.profiles;

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 160),
  relationship text null check (relationship is null or char_length(trim(relationship)) <= 80),
  notes text null check (notes is null or char_length(notes) <= 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  type public.account_type not null,
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  external_ref text null check (external_ref is null or char_length(trim(external_ref)) <= 160),
  is_own boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete restrict,
  billing_account_id uuid null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  last_four text null check (last_four is null or last_four ~ '^[0-9]{4}$'),
  holder_name text null check (holder_name is null or char_length(trim(holder_name)) <= 160),
  closing_day smallint null check (closing_day between 1 and 31),
  due_day smallint null check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (billing_account_id, user_id)
    references public.accounts (id, user_id) on delete restrict
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid null,
  card_id uuid null,
  original_filename text not null check (char_length(trim(original_filename)) between 1 and 255),
  storage_path text null check (storage_path is null or char_length(trim(storage_path)) > 0),
  mime_type text not null check (char_length(trim(mime_type)) between 1 and 120),
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  detected_institution_id uuid null references public.institutions (id) on delete restrict,
  source_kind public.source_kind not null,
  format public.file_format not null,
  period_start date null,
  period_end date null,
  parser_name text not null check (char_length(trim(parser_name)) between 1 and 120),
  parser_version text not null check (char_length(trim(parser_version)) between 1 and 80),
  status public.import_status not null default 'uploaded',
  row_count integer not null default 0 check (row_count >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_summary jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, sha256),
  check (num_nonnulls(account_id, card_id) <= 1),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (success_count + error_count <= row_count),
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  foreign key (card_id, user_id)
    references public.cards (id, user_id) on delete restrict
);

create table public.raw_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  import_id uuid not null,
  source_row_number integer null check (source_row_number is null or source_row_number > 0),
  external_id text null check (external_id is null or char_length(trim(external_id)) <= 255),
  raw_payload jsonb not null,
  raw_text text null,
  record_hash text not null check (record_hash ~ '^[0-9a-f]{64}$'),
  parse_status public.parse_status not null default 'pending',
  parse_errors jsonb null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, import_id, record_hash),
  foreign key (import_id, user_id)
    references public.imports (id, user_id) on delete restrict
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_record_id uuid null,
  import_id uuid not null,
  account_id uuid null,
  card_id uuid null,
  external_id text null check (external_id is null or char_length(trim(external_id)) <= 255),
  occurred_on date null,
  posted_on date null,
  competence_month date not null check (competence_month = date_trunc('month', competence_month)::date),
  description_raw text not null check (char_length(trim(description_raw)) between 1 and 2000),
  description_normalized text not null check (char_length(trim(description_normalized)) between 1 and 2000),
  amount numeric(18, 2) not null check (amount >= 0),
  direction public.transaction_direction not null,
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  nature public.economic_nature not null default 'unclassified',
  category_id uuid null,
  subcategory_id uuid null,
  review_status public.review_status not null default 'pending',
  category_source public.decision_source not null default 'unknown',
  nature_source public.decision_source not null default 'unknown',
  ownership_source public.decision_source not null default 'unknown',
  category_confidence numeric(5, 4) null check (category_confidence between 0 and 1),
  nature_confidence numeric(5, 4) null check (nature_confidence between 0 and 1),
  ownership_confidence numeric(5, 4) null check (ownership_confidence between 0 and 1),
  manual_locks jsonb not null default '{}'::jsonb,
  dedupe_key text not null check (char_length(trim(dedupe_key)) between 1 and 255),
  is_void boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (num_nonnulls(account_id, card_id) <= 1),
  foreign key (raw_record_id, user_id)
    references public.raw_records (id, user_id) on delete restrict,
  foreign key (import_id, user_id)
    references public.imports (id, user_id) on delete restrict,
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  foreign key (card_id, user_id)
    references public.cards (id, user_id) on delete restrict,
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete restrict,
  foreign key (subcategory_id, user_id)
    references public.subcategories (id, user_id) on delete restrict
);

create unique index transactions_user_dedupe_key_active_idx
on public.transactions (user_id, dedupe_key)
where not is_void;
create unique index transactions_user_import_external_id_idx
on public.transactions (user_id, import_id, external_id)
where external_id is not null;
create index transactions_user_competence_month_idx
on public.transactions (user_id, competence_month);
create index transactions_user_nature_competence_month_idx
on public.transactions (user_id, nature, competence_month);
create index transactions_user_category_competence_month_idx
on public.transactions (user_id, category_id, competence_month);

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid not null,
  owner_type public.owner_type not null,
  person_id uuid null,
  amount numeric(18, 2) not null check (amount >= 0),
  percentage numeric(9, 6) null check (percentage between 0 and 100),
  source public.decision_source not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (
    (owner_type = 'self' and person_id is null)
    or (owner_type = 'third_party' and person_id is not null)
  ),
  foreign key (transaction_id, user_id)
    references public.transactions (id, user_id) on delete cascade,
  foreign key (person_id, user_id)
    references public.people (id, user_id) on delete restrict
);

create index allocations_user_transaction_idx
on public.allocations (user_id, transaction_id);

-- A raw record is evidence. Technical parse status is recorded at insertion;
-- later parser runs add new records rather than rewriting prior evidence.
create function public.prevent_raw_record_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'raw_records are immutable evidence';
end;
$$;

create trigger raw_records_prevent_update
before update or delete on public.raw_records
for each row execute procedure public.prevent_raw_record_mutation();

-- Allocation is an invariant of an interpreted transaction. It is deferred so
-- a transaction and its default/edited allocations can be written atomically.
create function public.assert_transaction_allocation_total(
  target_transaction_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  transaction_amount numeric(18, 2);
  allocation_amount numeric(18, 2);
begin
  select amount into transaction_amount
  from public.transactions
  where id = target_transaction_id and user_id = target_user_id and not is_void;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0) into allocation_amount
  from public.allocations
  where transaction_id = target_transaction_id and user_id = target_user_id;

  if allocation_amount <> transaction_amount then
    raise exception
      'allocation total (%) must equal transaction amount (%)',
      allocation_amount, transaction_amount
      using errcode = '23514';
  end if;

  return;
end;
$$;

create function public.assert_allocation_total_from_allocation_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.assert_transaction_allocation_total(
    coalesce(new.transaction_id, old.transaction_id),
    coalesce(new.user_id, old.user_id)
  );
  return null;
end;
$$;

create function public.assert_allocation_total_from_transaction_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.assert_transaction_allocation_total(new.id, new.user_id);
  return null;
end;
$$;

create constraint trigger allocations_total_matches_transaction
after insert or update or delete on public.allocations
deferrable initially deferred
for each row execute procedure public.assert_allocation_total_from_allocation_trigger();

create constraint trigger transaction_total_matches_allocations
after insert or update of amount, is_void on public.transactions
deferrable initially deferred
for each row execute procedure public.assert_allocation_total_from_transaction_trigger();

create trigger institutions_set_updated_at before update on public.institutions
for each row execute procedure public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute procedure public.set_updated_at();
create trigger subcategories_set_updated_at before update on public.subcategories
for each row execute procedure public.set_updated_at();
create trigger people_set_updated_at before update on public.people
for each row execute procedure public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts
for each row execute procedure public.set_updated_at();
create trigger cards_set_updated_at before update on public.cards
for each row execute procedure public.set_updated_at();
create trigger imports_set_updated_at before update on public.imports
for each row execute procedure public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
for each row execute procedure public.set_updated_at();
create trigger allocations_set_updated_at before update on public.allocations
for each row execute procedure public.set_updated_at();

revoke all on table public.institutions from anon;
grant select on table public.institutions to authenticated;
alter table public.institutions enable row level security;
alter table public.institutions force row level security;
create policy "institutions_select_authenticated"
on public.institutions for select to authenticated using (true);

revoke all on function public.prevent_raw_record_mutation() from public;
revoke all on function public.assert_transaction_allocation_total(uuid, uuid) from public;
revoke all on function public.assert_allocation_total_from_allocation_trigger() from public;
revoke all on function public.assert_allocation_total_from_transaction_trigger() from public;
revoke all on function public.seed_default_categories(uuid) from public;
revoke all on function public.seed_categories_for_new_profile() from public;

-- Every user-owned table has explicit policies for all four operations. The
-- duplicated user_id plus composite FKs prevent cross-user child references.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories', 'subcategories', 'people', 'accounts', 'cards',
    'imports', 'raw_records', 'transactions', 'allocations'
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
