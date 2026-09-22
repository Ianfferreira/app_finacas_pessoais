-- Stage 6: explainable merchant classification and independent review work.
create type public.review_item_type as enum (
  'category', 'ownership', 'nature', 'competence', 'reconciliation', 'possible_duplicate'
);
create type public.review_item_status as enum ('open', 'resolved', 'dismissed');

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_name text not null check (char_length(trim(canonical_name)) between 1 and 240),
  normalized_name text not null check (char_length(trim(normalized_name)) between 1 and 240),
  default_category_id uuid null,
  default_nature public.economic_nature null,
  is_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, normalized_name),
  foreign key (default_category_id, user_id)
    references public.categories(id, user_id) on delete restrict
);

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null,
  normalized_alias text not null check (char_length(trim(normalized_alias)) between 1 and 240),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, normalized_alias),
  foreign key (merchant_id, user_id)
    references public.merchants(id, user_id) on delete cascade
);

create table public.classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description_contains text not null check (char_length(trim(description_contains)) between 1 and 240),
  priority integer not null default 100 check (priority between 1 and 1000000),
  category_id uuid null,
  nature public.economic_nature null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories(id, user_id) on delete restrict,
  check (category_id is not null or nature is not null)
);

create index classification_rules_active_priority_idx
  on public.classification_rules (user_id, is_active, priority, created_at);

create table public.classification_rule_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  rule_id uuid null,
  merchant_id uuid null,
  field text not null check (field in ('category', 'nature', 'ownership', 'competence')),
  source public.decision_source not null,
  value jsonb not null,
  applied_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (transaction_id, user_id)
    references public.transactions(id, user_id) on delete cascade,
  foreign key (rule_id, user_id)
    references public.classification_rules(id, user_id) on delete restrict,
  foreign key (merchant_id, user_id)
    references public.merchants(id, user_id) on delete restrict
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  type public.review_item_type not null,
  status public.review_item_status not null default 'open',
  detail jsonb not null default '{}'::jsonb,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, transaction_id, type),
  foreign key (transaction_id, user_id)
    references public.transactions(id, user_id) on delete cascade,
  check ((status = 'open' and resolved_at is null) or status <> 'open')
);

create index review_items_open_idx on public.review_items (user_id, status, created_at);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid not null,
  event_type text not null check (char_length(trim(event_type)) between 1 and 100),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index audit_events_entity_idx on public.audit_events (user_id, entity_type, entity_id, created_at desc);

create function public.reprocess_transaction_classification(p_transaction_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  tx public.transactions%rowtype;
  matched_rule public.classification_rules%rowtype;
  matched_merchant public.merchants%rowtype;
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into tx from public.transactions where id = p_transaction_id and user_id = u;
  if not found then raise exception 'transaction not found' using errcode = 'P0002'; end if;

  select r.* into matched_rule
  from public.classification_rules r
  where r.user_id = u and r.is_active
    and tx.description_normalized like '%' || lower(trim(r.description_contains)) || '%'
  order by r.priority asc, r.created_at asc
  limit 1;

  select m.* into matched_merchant
  from public.merchant_aliases a
  join public.merchants m on m.id = a.merchant_id and m.user_id = a.user_id
  where a.user_id = u and m.is_confirmed
    and a.normalized_alias = tx.description_normalized
  limit 1;

  if coalesce((tx.manual_locks->>'category')::boolean, false) = false then
    if matched_rule.id is not null and matched_rule.category_id is not null then
      update public.transactions
      set category_id = matched_rule.category_id, category_source = 'user_rule', category_confidence = 1
      where id = tx.id and user_id = u;
      insert into public.classification_rule_applications (user_id, transaction_id, rule_id, field, source, value)
      values (u, tx.id, matched_rule.id, 'category', 'user_rule', jsonb_build_object('category_id', matched_rule.category_id));
    elsif matched_merchant.id is not null and matched_merchant.default_category_id is not null then
      update public.transactions
      set category_id = matched_merchant.default_category_id, category_source = 'merchant_mapping', category_confidence = 1
      where id = tx.id and user_id = u;
      insert into public.classification_rule_applications (user_id, transaction_id, merchant_id, field, source, value)
      values (u, tx.id, matched_merchant.id, 'category', 'merchant_mapping', jsonb_build_object('category_id', matched_merchant.default_category_id));
    end if;
  end if;

  if coalesce((tx.manual_locks->>'nature')::boolean, false) = false then
    if matched_rule.id is not null and matched_rule.nature is not null then
      update public.transactions
      set nature = matched_rule.nature, nature_source = 'user_rule', nature_confidence = 1
      where id = tx.id and user_id = u;
      insert into public.classification_rule_applications (user_id, transaction_id, rule_id, field, source, value)
      values (u, tx.id, matched_rule.id, 'nature', 'user_rule', jsonb_build_object('nature', matched_rule.nature));
    elsif matched_merchant.id is not null and matched_merchant.default_nature is not null then
      update public.transactions
      set nature = matched_merchant.default_nature, nature_source = 'merchant_mapping', nature_confidence = 1
      where id = tx.id and user_id = u;
      insert into public.classification_rule_applications (user_id, transaction_id, merchant_id, field, source, value)
      values (u, tx.id, matched_merchant.id, 'nature', 'merchant_mapping', jsonb_build_object('nature', matched_merchant.default_nature));
    end if;
  end if;

  insert into public.review_items (user_id, transaction_id, type, detail)
  values (u, tx.id, 'category', jsonb_build_object('reason', 'category_missing'))
  on conflict (user_id, transaction_id, type) do update set status = 'open', resolved_at = null, updated_at = now();
  update public.review_items set status = 'resolved', resolved_at = now(), updated_at = now()
  where user_id = u and transaction_id = tx.id and type = 'category'
    and (select category_id from public.transactions where id = tx.id) is not null;

  insert into public.review_items (user_id, transaction_id, type, detail)
  values (u, tx.id, 'nature', jsonb_build_object('reason', 'nature_unclassified'))
  on conflict (user_id, transaction_id, type) do update set status = 'open', resolved_at = null, updated_at = now();
  update public.review_items set status = 'resolved', resolved_at = now(), updated_at = now()
  where user_id = u and transaction_id = tx.id and type = 'nature'
    and (select nature from public.transactions where id = tx.id) <> 'unclassified';

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'transaction', tx.id, 'classification_reprocessed', jsonb_build_object('manual_locks', tx.manual_locks));
end;
$$;

create function public.prevent_audit_event_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin raise exception 'audit_events are append-only'; end;
$$;
create trigger audit_events_prevent_mutation
before update or delete on public.audit_events
for each row execute procedure public.prevent_audit_event_mutation();

create trigger merchants_set_updated_at before update on public.merchants
for each row execute procedure public.set_updated_at();
create trigger classification_rules_set_updated_at before update on public.classification_rules
for each row execute procedure public.set_updated_at();
create trigger review_items_set_updated_at before update on public.review_items
for each row execute procedure public.set_updated_at();

revoke all on function public.reprocess_transaction_classification(uuid) from public;
grant execute on function public.reprocess_transaction_classification(uuid) to authenticated;
revoke all on function public.prevent_audit_event_mutation() from public;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'merchants', 'merchant_aliases', 'classification_rules',
    'classification_rule_applications', 'review_items', 'audit_events'
  ] loop
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
