begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email)
values
  ('e1000000-0000-4000-8000-000000000001', 'category-a@example.test'),
  ('e2000000-0000-4000-8000-000000000002', 'category-b@example.test');

insert into public.institutions (id, code, name)
values ('e3000000-0000-4000-8000-000000000001', 'CATEGORY_TEST', 'Instituição sintética de categoria');

insert into public.accounts (id, user_id, institution_id, name, type)
values
  ('e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001', 'Conta sintética A', 'checking'),
  ('e4010000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000001', 'Conta sintética B', 'checking');

insert into public.categories (id, user_id, name, kind)
values
  ('e4100000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Categoria de despesa sintética', 'expense'),
  ('e4110000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Categoria de receita sintética', 'income'),
  ('e4120000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000002', 'Categoria externa sintética', 'expense');

insert into public.subcategories (id, user_id, category_id, name)
values ('e4200000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e4100000-0000-4000-8000-000000000001', 'Subcategoria sintética');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('e5000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'category-a.csv', 'text/csv', 1, repeat('1', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('e5010000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000002', 'e4010000-0000-4000-8000-000000000001', 'category-b.csv', 'text/csv', 1, repeat('2', 64), 'bank_statement', 'csv', 'synthetic', '1');

set local role authenticated;
set local "request.jwt.claim.sub" = 'e1000000-0000-4000-8000-000000000001';

insert into public.transactions (id, user_id, import_id, account_id, competence_month, description_raw, description_normalized, amount, direction, nature, category_id, subcategory_id, dedupe_key)
values
  ('e6000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', '2026-09-01', 'Despesa sintética', 'despesa sintetica', 44.00, 'outflow', 'expense', 'e4100000-0000-4000-8000-000000000001', 'e4200000-0000-4000-8000-000000000001', 'category-expense'),
  ('e6010000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', '2026-09-01', 'Transferência sintética', 'transferencia sintetica', 44.00, 'outflow', 'own_transfer', null, null, 'category-transfer');

insert into public.allocations (user_id, transaction_id, owner_type, amount)
values
  ('e1000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000001', 'self', 44.00),
  ('e1000000-0000-4000-8000-000000000001', 'e6010000-0000-4000-8000-000000000001', 'self', 44.00);

insert into public.review_items (user_id, transaction_id, type)
values ('e1000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000001', 'category');

select lives_ok(
  $$select public.set_transaction_category_manual('e6000000-0000-4000-8000-000000000001', 'e4100000-0000-4000-8000-000000000001')$$,
  'manual category decision is accepted'
);
select is(
  (select category_source from public.transactions where id = 'e6000000-0000-4000-8000-000000000001'),
  'manual'::public.decision_source,
  'manual category source is recorded'
);
select ok(
  (select coalesce((manual_locks ->> 'category')::boolean, false) from public.transactions where id = 'e6000000-0000-4000-8000-000000000001'),
  'manual category decision is locked'
);
select is(
  (select subcategory_id from public.transactions where id = 'e6000000-0000-4000-8000-000000000001'),
  null::uuid,
  'changing category clears a prior subcategory to avoid mismatched hierarchy'
);
select is(
  (select status from public.review_items where transaction_id = 'e6000000-0000-4000-8000-000000000001' and type = 'category'),
  'resolved'::public.review_item_status,
  'manual category decision resolves category review'
);
select is(
  (select count(*) from public.audit_events where entity_id = 'e6000000-0000-4000-8000-000000000001' and event_type = 'category_set_manually'),
  1::bigint,
  'manual category decision is audited'
);
select throws_ok(
  $$select public.set_transaction_category_manual('e6000000-0000-4000-8000-000000000001', 'e4110000-0000-4000-8000-000000000001')$$,
  '22023', 'category kind does not match transaction nature',
  'income category cannot be assigned to an expense'
);
select throws_ok(
  $$select public.set_transaction_category_manual('e6010000-0000-4000-8000-000000000001', 'e4100000-0000-4000-8000-000000000001')$$,
  '22023', 'transaction nature cannot receive a category',
  'transfer cannot be categorized as economic consumption'
);
select throws_ok(
  $$select public.set_transaction_category_manual('e6000000-0000-4000-8000-000000000001', 'e4120000-0000-4000-8000-000000000001')$$,
  'P0002', 'category not found',
  'user cannot choose another user category'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'e2000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.set_transaction_category_manual('e6000000-0000-4000-8000-000000000001', 'e4120000-0000-4000-8000-000000000001')$$,
  'P0002', 'active transaction not found',
  'user cannot categorize another user transaction'
);

select * from finish();
rollback;
