begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email)
values
  ('c1000000-0000-4000-8000-000000000001', 'card-payment-a@example.test'),
  ('c2000000-0000-4000-8000-000000000002', 'card-payment-b@example.test');

insert into public.institutions (id, code, name)
values ('c3000000-0000-4000-8000-000000000001', 'CARD_PAYMENT_TEST', 'Instituição sintética de pagamentos');

insert into public.accounts (id, user_id, institution_id, name, type)
values
  ('c4000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'Conta de pagamento A', 'checking'),
  ('c4010000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', 'Conta de pagamento B', 'checking');

insert into public.cards (id, user_id, institution_id, billing_account_id, name, last_four)
values
  ('c4100000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 'Cartão sintético A', '1111');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('c5000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 'payment-a.csv', 'text/csv', 1, repeat('1', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('c5010000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002', 'c4010000-0000-4000-8000-000000000001', 'payment-b.csv', 'text/csv', 1, repeat('2', 64), 'bank_statement', 'csv', 'synthetic', '1');

insert into public.imports (id, user_id, card_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('c5100000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c4100000-0000-4000-8000-000000000001', 'statement-one.pdf', 'application/pdf', 1, repeat('3', 64), 'card_statement', 'pdf', 'synthetic', '1'),
  ('c5110000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c4100000-0000-4000-8000-000000000001', 'statement-two.pdf', 'application/pdf', 1, repeat('4', 64), 'card_statement', 'pdf', 'synthetic', '1'),
  ('c5120000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c4100000-0000-4000-8000-000000000001', 'statement-zero.pdf', 'application/pdf', 1, repeat('5', 64), 'card_statement', 'pdf', 'synthetic', '1');

insert into public.card_statements (id, user_id, import_id, card_id, cycle_end, due_on, total_due, status)
values
  ('c6000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5100000-0000-4000-8000-000000000001', 'c4100000-0000-4000-8000-000000000001', '2026-08-31', '2026-09-10', 100.00, 'processed'),
  ('c6010000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5110000-0000-4000-8000-000000000001', 'c4100000-0000-4000-8000-000000000001', '2026-09-30', '2026-10-10', 20.00, 'processed'),
  ('c6020000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5120000-0000-4000-8000-000000000001', 'c4100000-0000-4000-8000-000000000001', '2026-10-31', '2026-11-10', 0.00, 'processed');

set local role authenticated;
set local "request.jwt.claim.sub" = 'c1000000-0000-4000-8000-000000000001';

insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values
  ('c7000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', '2026-09-10', '2026-09-01', 'Pagamento sintético principal', 'pagamento sintetico principal', 120.00, 'outflow', 'card_payment', 'payment-main'),
  ('c7010000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', '2026-10-10', '2026-10-01', 'Antecipação sintética', 'antecipacao sintetica', 30.00, 'outflow', 'card_payment', 'payment-advance'),
  ('c7020000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', '2026-09-10', '2026-09-01', 'Outro pagamento sintético', 'outro pagamento sintetico', 50.00, 'outflow', 'card_payment', 'payment-cap');

select is(
  (select count(*) from public.review_items where type = 'reconciliation' and status = 'open'),
  3::bigint,
  'every unallocated active card payment opens reconciliation work'
);
select lives_ok(
  $$select public.record_card_statement_payment_allocation('c6000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001', 100.00)$$,
  'a payment can allocate its first documented statement amount'
);
select lives_ok(
  $$select public.record_card_statement_payment_allocation('c6010000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001', 20.00)$$,
  'a payment can be split across a second statement'
);
select is(
  (select coalesce(sum(amount), 0) from public.card_statement_payment_allocations where payment_transaction_id = 'c7000000-0000-4000-8000-000000000001'),
  120.00::numeric,
  'the full payment amount is represented by explicit allocations'
);
select is(
  (select status from public.review_items where transaction_id = 'c7000000-0000-4000-8000-000000000001' and type = 'reconciliation'),
  'resolved'::public.review_item_status,
  'fully allocated payment resolves only its reconciliation work'
);
select throws_ok(
  $$select public.record_card_statement_payment_allocation('c6020000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001', 1.00)$$,
  '22023', 'payment allocation exceeds transaction amount',
  'allocations cannot exceed the payment transaction amount'
);
select lives_ok(
  $$select public.record_card_statement_payment_allocation('c6020000-0000-4000-8000-000000000001', 'c7010000-0000-4000-8000-000000000001', 30.00)$$,
  'a documented zero-due statement accepts an explicit advance payment allocation'
);
select is(
  (select amount from public.card_statement_payment_allocations where payment_transaction_id = 'c7010000-0000-4000-8000-000000000001'),
  30.00::numeric,
  'advance allocation retains the exact amount'
);
select is(
  (select status from public.review_items where transaction_id = 'c7010000-0000-4000-8000-000000000001' and type = 'reconciliation'),
  'resolved'::public.review_item_status,
  'fully allocated advance payment resolves reconciliation'
);
select throws_ok(
  $$select public.record_card_statement_payment_allocation('c6000000-0000-4000-8000-000000000001', 'c7020000-0000-4000-8000-000000000001', 1.00)$$,
  '22023', 'statement allocation exceeds documented amount',
  'positive documented statement total cannot be overallocated'
);
select lives_ok(
  $$select public.remove_card_statement_payment_allocation((select id from public.card_statement_payment_allocations where payment_transaction_id = 'c7010000-0000-4000-8000-000000000001'))$$,
  'an explicit allocation can be removed for correction'
);
select is(
  (select count(*) from public.card_statement_payment_allocations where payment_transaction_id = 'c7010000-0000-4000-8000-000000000001'),
  0::bigint,
  'removing an allocation deletes only the allocation record'
);
select is(
  (select status from public.review_items where transaction_id = 'c7010000-0000-4000-8000-000000000001' and type = 'reconciliation'),
  'open'::public.review_item_status,
  'removing an allocation reopens payment reconciliation'
);
select is(
  (select count(*) from public.audit_events where entity_type = 'card_statement_payment_allocation'),
  4::bigint,
  'allocation creation and removal are fully audited'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'c2000000-0000-4000-8000-000000000002';
insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values ('c7030000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002', 'c5010000-0000-4000-8000-000000000001', 'c4010000-0000-4000-8000-000000000001', '2026-09-10', '2026-09-01', 'Pagamento de outro usuário', 'pagamento de outro usuario', 50.00, 'outflow', 'card_payment', 'payment-other');
select is(
  (select count(*) from public.card_statement_payment_allocations),
  0::bigint,
  'another user cannot read payment allocations'
);
select throws_ok(
  $$select public.record_card_statement_payment_allocation('c6000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001', 1.00)$$,
  'P0002', 'card statement not found',
  'another user cannot allocate a payment to a foreign statement'
);

select * from finish();
rollback;
