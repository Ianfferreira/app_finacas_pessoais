begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email)
values
  ('d1000000-0000-4000-8000-000000000001', 'duplicate-resolution-a@example.test'),
  ('d2000000-0000-4000-8000-000000000002', 'duplicate-resolution-b@example.test');

insert into public.institutions (id, code, name)
values ('d3000000-0000-4000-8000-000000000001', 'DUPLICATE_RESOLUTION_TEST', 'Instituição sintética de resolução');

insert into public.accounts (id, user_id, institution_id, name, type)
values
  ('d4000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'Conta sintética A', 'checking'),
  ('d4010000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000001', 'Conta sintética B', 'checking');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('d5000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'source-one.csv', 'text/csv', 1, repeat('1', 64), 'bank_statement', 'csv', 'synthetic-one', '1'),
  ('d5010000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'source-two.pdf', 'application/pdf', 1, repeat('2', 64), 'bank_statement', 'pdf', 'synthetic-two', '1'),
  ('d5020000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'd4010000-0000-4000-8000-000000000001', 'source-other.csv', 'text/csv', 1, repeat('3', 64), 'bank_statement', 'csv', 'synthetic-other', '1');

set local role authenticated;
set local "request.jwt.claim.sub" = 'd1000000-0000-4000-8000-000000000001';

insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values
  ('d6000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', '2026-09-03', '2026-09-01', 'Compra duplicada a manter', 'compra duplicada a manter', 55.00, 'outflow', 'expense', 'duplicate-keep'),
  ('d6010000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd5010000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', '2026-09-03', '2026-09-01', 'Compra duplicada a manter', 'compra duplicada a manter', 55.00, 'outflow', 'expense', 'duplicate-void'),
  ('d6020000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', '2026-09-07', '2026-09-01', 'Compra duplicada descartada', 'compra duplicada descartada', 20.00, 'outflow', 'expense', 'dismiss-one'),
  ('d6030000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd5010000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', '2026-09-07', '2026-09-01', 'Compra duplicada descartada', 'compra duplicada descartada', 20.00, 'outflow', 'expense', 'dismiss-two');

insert into public.allocations (user_id, transaction_id, owner_type, amount)
values
  ('d1000000-0000-4000-8000-000000000001', 'd6000000-0000-4000-8000-000000000001', 'self', 55.00),
  ('d1000000-0000-4000-8000-000000000001', 'd6010000-0000-4000-8000-000000000001', 'self', 55.00),
  ('d1000000-0000-4000-8000-000000000001', 'd6020000-0000-4000-8000-000000000001', 'self', 20.00),
  ('d1000000-0000-4000-8000-000000000001', 'd6030000-0000-4000-8000-000000000001', 'self', 20.00);

select is(
  (select count(*) from public.possible_duplicate_candidates),
  2::bigint,
  'two independent deterministic duplicate candidates are awaiting review'
);
select lives_ok(
  $$select public.confirm_possible_duplicate_candidate((select id from public.possible_duplicate_candidates where transaction_id = 'd6010000-0000-4000-8000-000000000001'), 'd6000000-0000-4000-8000-000000000001')$$,
  'user explicitly confirms the canonical transaction'
);
select ok(
  (select is_void from public.transactions where id = 'd6010000-0000-4000-8000-000000000001'),
  'only the user-selected redundant interpretation is voided'
);
select ok(
  not (select is_void from public.transactions where id = 'd6000000-0000-4000-8000-000000000001'),
  'the selected canonical interpretation remains active'
);
select is(
  (select status from public.possible_duplicate_candidates where transaction_id = 'd6010000-0000-4000-8000-000000000001'),
  'confirmed'::public.duplicate_candidate_status,
  'candidate history records the explicit confirmation'
);
select is(
  (select from_transaction_id from public.transaction_links where link_type = 'duplicate_of'),
  'd6010000-0000-4000-8000-000000000001'::uuid,
  'duplicate link preserves redundant-to-canonical direction'
);
select is(
  (select count(*) from public.review_items where transaction_id in ('d6000000-0000-4000-8000-000000000001', 'd6010000-0000-4000-8000-000000000001') and type = 'possible_duplicate' and status = 'resolved'),
  2::bigint,
  'confirmation resolves duplicate review for the chosen pair'
);
select is(
  (select personal_expenses from public.month_metrics('2026-09-01')),
  95.00::numeric,
  'voided duplicate no longer contributes to monthly personal expenses'
);
select throws_ok(
  $$select public.confirm_possible_duplicate_candidate((select id from public.possible_duplicate_candidates where transaction_id = 'd6030000-0000-4000-8000-000000000001'), 'd6000000-0000-4000-8000-000000000001')$$,
  '22023', 'canonical transaction must belong to the candidate pair',
  'user cannot choose an unrelated transaction as canonical'
);
select lives_ok(
  $$select public.dismiss_possible_duplicate_candidate((select id from public.possible_duplicate_candidates where transaction_id = 'd6030000-0000-4000-8000-000000000001'))$$,
  'user can explicitly dismiss a possible duplicate'
);
select is(
  (select status from public.possible_duplicate_candidates where transaction_id = 'd6030000-0000-4000-8000-000000000001'),
  'dismissed'::public.duplicate_candidate_status,
  'dismissed candidate remains retained as evidence'
);
select is(
  (select count(*) from public.review_items where transaction_id in ('d6020000-0000-4000-8000-000000000001', 'd6030000-0000-4000-8000-000000000001') and type = 'possible_duplicate' and status = 'resolved'),
  2::bigint,
  'dismissal resolves only the pair review work'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'd2000000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.possible_duplicate_candidates),
  0::bigint,
  'another user cannot read possible duplicate candidates'
);

select * from finish();
rollback;
