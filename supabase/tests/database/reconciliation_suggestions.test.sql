begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email)
values
  ('b1000000-0000-4000-8000-000000000001', 'reconciliation-a@example.test'),
  ('b2000000-0000-4000-8000-000000000002', 'reconciliation-b@example.test');

insert into public.institutions (id, code, name)
values ('b3000000-0000-4000-8000-000000000001', 'RECON_TEST', 'Instituição sintética de conciliação');

insert into public.accounts (id, user_id, institution_id, name, type, is_own)
values
  ('b4000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'Conta própria de origem', 'checking', true),
  ('b4010000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'Conta própria de destino', 'checking', true),
  ('b4020000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'Conta externa', 'checking', false),
  ('b4030000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000001', 'Conta de outro usuário', 'checking', true);

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('b5000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 'reconciliation-a.csv', 'text/csv', 1, repeat('1', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('b5010000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b4010000-0000-4000-8000-000000000001', 'reconciliation-b.csv', 'text/csv', 1, repeat('2', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('b5020000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b4020000-0000-4000-8000-000000000001', 'reconciliation-external.csv', 'text/csv', 1, repeat('3', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('b5030000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', 'b4030000-0000-4000-8000-000000000001', 'reconciliation-other.csv', 'text/csv', 1, repeat('4', 64), 'bank_statement', 'csv', 'synthetic', '1');

set local role authenticated;
set local "request.jwt.claim.sub" = 'b1000000-0000-4000-8000-000000000001';

insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values
  ('b6000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', '2026-09-12', '2026-09-01', 'Saída entre contas sintéticas', 'saida entre contas sinteticas', 120.00, 'outflow', 'own_transfer', 'transfer-out'),
  ('b6010000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b5010000-0000-4000-8000-000000000001', 'b4010000-0000-4000-8000-000000000001', '2026-09-12', '2026-09-01', 'Entrada entre contas sintéticas', 'entrada entre contas sinteticas', 120.00, 'inflow', 'own_transfer', 'transfer-in'),
  ('b6020000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', '2026-09-02', '2026-09-01', 'Compra sintética', 'compra sintetica', 33.00, 'outflow', 'expense', 'expense-original'),
  ('b6030000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', '2026-09-18', '2026-09-01', 'Estorno sintético', 'estorno sintetico', 33.00, 'inflow', 'reversal', 'expense-reversal'),
  ('b6040000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b5020000-0000-4000-8000-000000000001', 'b4020000-0000-4000-8000-000000000001', '2026-09-12', '2026-09-01', 'Entrada externa', 'entrada externa', 120.00, 'inflow', 'own_transfer', 'external-in');

select is(
  (select count(*) from public.reconciliation_candidates where link_type = 'own_transfer_pair'),
  1::bigint,
  'same-day exact transfer between two own accounts becomes one suggestion'
);
select is(
  (select from_transaction_id from public.reconciliation_candidates where link_type = 'own_transfer_pair'),
  'b6000000-0000-4000-8000-000000000001'::uuid,
  'transfer candidate keeps outflow as the source movement'
);
select is(
  (select evidence ->> 'strategy' from public.reconciliation_candidates where link_type = 'own_transfer_pair'),
  'own_transfer_exact_amount_same_date',
  'transfer candidate keeps explainable matching evidence'
);
select is(
  (select count(*) from public.reconciliation_candidates where link_type = 'reversal_of'),
  1::bigint,
  'exact reversal in the same account becomes one suggestion'
);
select is(
  (select from_transaction_id from public.reconciliation_candidates where link_type = 'reversal_of'),
  'b6020000-0000-4000-8000-000000000001'::uuid,
  'reversal candidate keeps the original expense as the source movement'
);
select is(
  (select count(*) from public.reconciliation_candidates where amount = 120.00 and link_type = 'own_transfer_pair'),
  1::bigint,
  'an account not marked as own cannot create a transfer candidate'
);
select is(
  (select count(*) from public.review_items where type = 'reconciliation' and status = 'open'),
  4::bigint,
  'each candidate endpoint receives its independent reconciliation review'
);

select lives_ok(
  $$select public.create_confirmed_transaction_link('b6000000-0000-4000-8000-000000000001', 'b6010000-0000-4000-8000-000000000001', 'own_transfer_pair', 120.00)$$,
  'user explicitly confirms the transfer candidate'
);
select is(
  (select status from public.reconciliation_candidates where link_type = 'own_transfer_pair'),
  'confirmed'::public.reconciliation_candidate_status,
  'confirmed link preserves the candidate decision'
);
select is(
  (select count(*) from public.review_items where transaction_id in ('b6000000-0000-4000-8000-000000000001', 'b6010000-0000-4000-8000-000000000001') and type = 'reconciliation' and status = 'resolved'),
  2::bigint,
  'confirming the candidate resolves reconciliation for both movements'
);

select lives_ok(
  $$select public.dismiss_reconciliation_candidate((select id from public.reconciliation_candidates where link_type = 'reversal_of'))$$,
  'user can explicitly dismiss a reversal candidate'
);
select is(
  (select status from public.reconciliation_candidates where link_type = 'reversal_of'),
  'dismissed'::public.reconciliation_candidate_status,
  'dismissal is retained instead of deleting the candidate history'
);
select is(
  (select status from public.review_items where transaction_id = 'b6030000-0000-4000-8000-000000000001' and type = 'reconciliation'),
  'resolved'::public.review_item_status,
  'dismissal resolves the candidate-owned review once no suggestion remains'
);
select lives_ok(
  $$select public.refresh_transaction_reconciliation_candidates('b6030000-0000-4000-8000-000000000001')$$,
  'a user can re-run reconciliation suggestion generation'
);
select is(
  (select status from public.reconciliation_candidates where link_type = 'reversal_of'),
  'dismissed'::public.reconciliation_candidate_status,
  'reprocessing does not silently reopen a dismissed candidate'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'b2000000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.reconciliation_candidates),
  0::bigint,
  'another authenticated user cannot read reconciliation candidates'
);
select throws_ok(
  $$select public.dismiss_reconciliation_candidate((select id from public.reconciliation_candidates limit 1))$$,
  'P0002', 'reconciliation candidate not found',
  'another user cannot dismiss a candidate they cannot access'
);

select * from finish();
rollback;
