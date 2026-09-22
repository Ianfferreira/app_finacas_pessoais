begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email)
values
  ('40000000-0000-4000-8000-000000000001', 'domain-a@example.test'),
  ('50000000-0000-4000-8000-000000000002', 'domain-b@example.test');

insert into public.institutions (id, code, name)
values ('60000000-0000-4000-8000-000000000001', 'SYNTHETIC', 'Instituição sintética');

insert into public.categories (id, user_id, name, kind)
values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Teste A', 'expense'),
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Teste B', 'expense');

insert into public.people (id, user_id, full_name)
values
  ('42000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Pessoa sintética A'),
  ('52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Pessoa sintética B');

insert into public.accounts (id, user_id, institution_id, name, type)
values
  ('43000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Conta A', 'checking'),
  ('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'Conta B', 'checking');

insert into public.cards (id, user_id, institution_id, name, last_four)
values
  ('43500000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Cartão A', '1111'),
  ('53500000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'Cartão B', '2222');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values
  ('44000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 'a.csv', 'text/csv', 1, repeat('a', 64), 'bank_statement', 'csv', 'synthetic', '1'),
  ('54000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '53000000-0000-4000-8000-000000000001', 'b.csv', 'text/csv', 1, repeat('b', 64), 'bank_statement', 'csv', 'synthetic', '1');

insert into public.raw_records (id, user_id, import_id, raw_payload, record_hash)
values
  ('45000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', '{"row":"a"}', repeat('c', 64)),
  ('55000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '54000000-0000-4000-8000-000000000001', '{"row":"b"}', repeat('d', 64));

insert into public.transactions (id, user_id, raw_record_id, import_id, account_id, competence_month, description_raw, description_normalized, amount, direction, nature, category_id, dedupe_key)
values
  ('46000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', '2026-08-01', 'Despesa A', 'despesa a', 10.00, 'outflow', 'expense', '41000000-0000-4000-8000-000000000001', 'synthetic-a'),
  ('46100000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', '2026-08-01', 'Crédito A', 'crédito a', 10.00, 'inflow', 'reversal', '41000000-0000-4000-8000-000000000001', 'synthetic-a-reversal'),
  ('56000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '2026-08-01', 'Despesa B', 'despesa b', 20.00, 'outflow', 'expense', '51000000-0000-4000-8000-000000000001', 'synthetic-b'),
  ('56100000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '2026-08-01', 'Crédito B', 'crédito b', 20.00, 'inflow', 'reversal', '51000000-0000-4000-8000-000000000001', 'synthetic-b-reversal');

insert into public.allocations (user_id, transaction_id, owner_type, amount)
values
  ('40000000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000001', 'self', 10.00),
  ('40000000-0000-4000-8000-000000000001', '46100000-0000-4000-8000-000000000001', 'self', 10.00),
  ('50000000-0000-4000-8000-000000000002', '56000000-0000-4000-8000-000000000001', 'self', 20.00),
  ('50000000-0000-4000-8000-000000000002', '56100000-0000-4000-8000-000000000001', 'self', 20.00);

insert into public.transaction_links (id, user_id, from_transaction_id, to_transaction_id, link_type, amount)
values
  ('47000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000001', '46100000-0000-4000-8000-000000000001', 'reversal_of', 10.00),
  ('57000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '56000000-0000-4000-8000-000000000001', '56100000-0000-4000-8000-000000000001', 'reversal_of', 20.00);

insert into public.card_statements (id, user_id, import_id, card_id, cycle_end, status)
values
  ('47500000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', '43500000-0000-4000-8000-000000000001', '2026-08-31', 'processed'),
  ('57500000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '54000000-0000-4000-8000-000000000001', '53500000-0000-4000-8000-000000000001', '2026-08-31', 'processed');

insert into public.installment_groups (id, user_id, card_id, source_group_key, description, total_installments)
values
  ('47600000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '43500000-0000-4000-8000-000000000001', 'a-example-2-3', 'Compra sintética A', 3),
  ('57600000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '53500000-0000-4000-8000-000000000001', 'b-example-2-3', 'Compra sintética B', 3);

insert into public.installments (user_id, installment_group_id, transaction_id, installment_number, competence_month, amount, status)
values
  ('40000000-0000-4000-8000-000000000001', '47600000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000001', 2, '2026-08-01', 10.00, 'realized'),
  ('50000000-0000-4000-8000-000000000002', '57600000-0000-4000-8000-000000000001', '56000000-0000-4000-8000-000000000001', 2, '2026-08-01', 20.00, 'realized');

set local role authenticated;
set local "request.jwt.claim.sub" = '40000000-0000-4000-8000-000000000001';

select is((select count(*) from public.institutions), 5::bigint, 'authenticated user can read the global institution catalog');
select is((select count(*) from public.categories), 17::bigint, 'user A reads only their 16 seeded categories plus one custom category');
select is((select count(*) from public.people), 1::bigint, 'user A reads only A person');
select is((select count(*) from public.accounts), 1::bigint, 'user A reads only A account');
select is((select count(*) from public.imports), 1::bigint, 'user A reads only A import');
select is((select count(*) from public.raw_records), 1::bigint, 'user A reads only A raw evidence');
select is((select count(*) from public.transactions), 2::bigint, 'user A reads only A transactions');
select is((select count(*) from public.allocations), 2::bigint, 'user A reads only A allocations');
select is((select count(*) from public.transaction_links), 1::bigint, 'user A reads only A transaction link');
select is((select count(*) from public.card_statements), 1::bigint, 'user A reads only A card statement');
select is((select count(*) from public.installment_groups), 1::bigint, 'user A reads only A installment group');
select is((select count(*) from public.installments), 1::bigint, 'user A reads only A installment');
select lives_ok(
  $$update public.transaction_links set status = 'confirmed' where id = '57000000-0000-4000-8000-000000000001'$$,
  'an update targeting user B link is accepted but affects no inaccessible row'
);
select throws_ok(
  $$insert into public.transaction_links (user_id, from_transaction_id, to_transaction_id, link_type, amount) values ('50000000-0000-4000-8000-000000000002', '46000000-0000-4000-8000-000000000001', '46100000-0000-4000-8000-000000000001', 'related', 0.00)$$,
  '42501', null,
  'user A cannot insert a transaction link owned by user B'
);
select lives_ok(
  $$delete from public.transaction_links where id = '57000000-0000-4000-8000-000000000001'$$,
  'a delete targeting user B link is accepted but affects no inaccessible row'
);
select lives_ok(
  $$update public.transactions set description_normalized = 'indevido' where id = '56000000-0000-4000-8000-000000000001'$$,
  'an update targeting user B is accepted but affects no inaccessible row'
);
reset role;
select is(
  (select description_normalized from public.transactions where id = '56000000-0000-4000-8000-000000000001'),
  'despesa b',
  'user A cannot update user B transaction'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '40000000-0000-4000-8000-000000000001';
select lives_ok(
  $$delete from public.raw_records where id = '55000000-0000-4000-8000-000000000001'$$,
  'a delete targeting user B is accepted but affects no inaccessible row'
);
reset role;
select ok(
  exists (select 1 from public.raw_records where id = '55000000-0000-4000-8000-000000000001'),
  'user A cannot delete user B raw evidence'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '40000000-0000-4000-8000-000000000001';
select throws_ok(
  $$update public.raw_records set raw_text = 'alterado' where id = '45000000-0000-4000-8000-000000000001'$$,
  'P0001', 'raw_records are immutable evidence',
  'even the owner cannot rewrite raw evidence'
);
select is(
  (select count(*) from public.transactions where user_id = '50000000-0000-4000-8000-000000000002'),
  0::bigint, 'explicit user-id filters do not bypass RLS'
);

select * from finish();
rollback;
