begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email)
values
  ('91000000-0000-4000-8000-000000000001', 'movement-a@example.test'),
  ('92000000-0000-4000-8000-000000000002', 'movement-b@example.test');

insert into public.institutions (id, code, name)
values ('93000000-0000-4000-8000-000000000001', 'MOVEMENT_TEST', 'Instituição sintética de movimentações');

insert into public.accounts (id, user_id, institution_id, name, type)
values
  ('94000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 'Conta sintética A', 'checking'),
  ('94100000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001', 'Conta sintética B', 'checking');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('95000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'movement-a.csv', 'text/csv', 1, repeat('9', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('95100000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', '94100000-0000-4000-8000-000000000001', 'movement-b.csv', 'text/csv', 1, repeat('a', 64), 'bank_statement', 'csv', 'synthetic', '1');

insert into public.transactions (id, user_id, import_id, account_id, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values
  ('96000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', '2026-09-01', 'Primeira movimentação', 'primeira movimentação', 70.00, 'outflow', 'unclassified', 'movement-a-one'),
  ('96100000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', '2026-09-01', 'Segunda movimentação', 'segunda movimentação', 70.00, 'inflow', 'card_payment', 'movement-a-two'),
  ('96200000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', '95100000-0000-4000-8000-000000000001', '94100000-0000-4000-8000-000000000001', '2026-09-01', 'Movimentação externa', 'movimentação externa', 70.00, 'outflow', 'unclassified', 'movement-b-one');

insert into public.allocations (user_id, transaction_id, owner_type, amount)
values
  ('91000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', 'self', 70.00),
  ('91000000-0000-4000-8000-000000000001', '96100000-0000-4000-8000-000000000001', 'self', 70.00),
  ('92000000-0000-4000-8000-000000000002', '96200000-0000-4000-8000-000000000001', 'self', 70.00);

insert into public.review_items (user_id, transaction_id, type, detail)
values
  ('91000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', 'nature', '{"reason":"synthetic"}'),
  ('91000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', 'reconciliation', '{"reason":"synthetic"}');

set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.set_transaction_nature_manual('96000000-0000-4000-8000-000000000001', 'expense')$$,
  'manual nature decision is accepted'
);
select is(
  (select nature from public.transactions where id = '96000000-0000-4000-8000-000000000001'),
  'expense'::public.economic_nature,
  'manual nature is persisted'
);
select ok(
  (select coalesce((manual_locks ->> 'nature')::boolean, false) from public.transactions where id = '96000000-0000-4000-8000-000000000001'),
  'manual nature is locked'
);
select is(
  (select status from public.review_items where transaction_id = '96000000-0000-4000-8000-000000000001' and type = 'nature'),
  'resolved'::public.review_item_status,
  'nature review is resolved with the direct edit'
);
select is(
  (select count(*) from public.audit_events where entity_id = '96000000-0000-4000-8000-000000000001' and event_type = 'nature_set_manually'),
  1::bigint,
  'manual nature edit is audited'
);
select lives_ok(
  $$select public.create_confirmed_transaction_link('96000000-0000-4000-8000-000000000001', '96100000-0000-4000-8000-000000000001', 'pays_statement', 70.00)$$,
  'confirmed transaction link is accepted'
);
select is(
  (select status from public.transaction_links where from_transaction_id = '96000000-0000-4000-8000-000000000001'),
  'confirmed'::public.review_status,
  'link is confirmed explicitly'
);
select is(
  (select status from public.review_items where transaction_id = '96000000-0000-4000-8000-000000000001' and type = 'reconciliation'),
  'resolved'::public.review_item_status,
  'confirmed link resolves its reconciliation review'
);
select is(
  (select count(*) from public.audit_events where entity_type = 'transaction_link' and event_type = 'transaction_link_confirmed'),
  1::bigint,
  'confirmed link is audited'
);
select throws_ok(
  $$select public.set_transaction_nature_manual('96200000-0000-4000-8000-000000000001', 'expense')$$,
  'P0002', 'transaction not found',
  'user cannot manually classify another user transaction'
);
select throws_ok(
  $$select public.create_confirmed_transaction_link('96000000-0000-4000-8000-000000000001', '96200000-0000-4000-8000-000000000001', 'related', 70.00)$$,
  'P0002', 'transaction not found',
  'user cannot link to another user transaction'
);
select throws_ok(
  $$select public.create_confirmed_transaction_link('96000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', 'related', 70.00)$$,
  '22023', 'invalid transaction link',
  'self links are rejected by the routine'
);

select * from finish();
rollback;
