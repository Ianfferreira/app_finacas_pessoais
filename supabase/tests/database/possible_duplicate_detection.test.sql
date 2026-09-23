begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email)
values
  ('a1000000-0000-4000-8000-000000000001', 'duplicate-a@example.test'),
  ('a2000000-0000-4000-8000-000000000002', 'duplicate-b@example.test');

insert into public.institutions (id, code, name)
values ('a3000000-0000-4000-8000-000000000001', 'DUPLICATE_TEST', 'Instituição sintética de duplicidade');

insert into public.accounts (id, user_id, institution_id, name, type)
values
  ('a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'Conta sintética A', 'checking'),
  ('a4010000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001', 'Conta sintética B', 'checking');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('a5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'source-one.csv', 'text/csv', 1, repeat('1', 64), 'bank_statement', 'csv', 'synthetic-one', '1'),
  ('a5010000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'source-two.pdf', 'application/pdf', 1, repeat('2', 64), 'bank_statement', 'pdf', 'synthetic-two', '1'),
  ('a5020000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'a4010000-0000-4000-8000-000000000001', 'source-other.csv', 'text/csv', 1, repeat('3', 64), 'bank_statement', 'csv', 'synthetic-other', '1');

set local role authenticated;
set local "request.jwt.claim.sub" = 'a1000000-0000-4000-8000-000000000001';

insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values
  ('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', '2026-09-03', '2026-09-01', 'Compra sintética', 'compra sintética', 55.00, 'outflow', 'expense', 'duplicate-one'),
  ('a6010000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5010000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', '2026-09-03', '2026-09-01', 'Compra sintética', 'compra sintética', 55.00, 'outflow', 'expense', 'duplicate-two');

insert into public.allocations (user_id, transaction_id, owner_type, amount)
values
  ('a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'self', 55.00),
  ('a1000000-0000-4000-8000-000000000001', 'a6010000-0000-4000-8000-000000000001', 'self', 55.00);

select is(
  (select count(*) from public.possible_duplicate_candidates),
  1::bigint,
  'matching records from distinct files create one candidate pair'
);
select is(
  (select status from public.possible_duplicate_candidates),
  'pending'::public.duplicate_candidate_status,
  'candidate remains pending instead of being merged automatically'
);
select is(
  (select count(*) from public.review_items where type = 'possible_duplicate' and status = 'open'),
  2::bigint,
  'both transactions receive an independent duplicate review item'
);
select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'possible_duplicates')::integer),
  2,
  'monthly quality exposes both movements affected by the candidate'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'a2000000-0000-4000-8000-000000000002';
insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values ('a6020000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'a5020000-0000-4000-8000-000000000001', 'a4010000-0000-4000-8000-000000000001', '2026-09-03', '2026-09-01', 'Compra sintética', 'compra sintética', 55.00, 'outflow', 'expense', 'duplicate-other-user');
insert into public.allocations (user_id, transaction_id, owner_type, amount)
values ('a2000000-0000-4000-8000-000000000002', 'a6020000-0000-4000-8000-000000000001', 'self', 55.00);
select is(
  (select count(*) from public.possible_duplicate_candidates),
  0::bigint,
  'another user cannot see or create a cross-user candidate'
);

reset role;
select is(
  (select count(*) from public.possible_duplicate_candidates),
  1::bigint,
  'candidate persists only for the original user in the database'
);
select is(
  (select fingerprint ->> 'source_scope' from public.possible_duplicate_candidates),
  'account',
  'candidate retains an explainable deterministic fingerprint'
);

select * from finish();
rollback;
