begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email)
values ('70000000-0000-4000-8000-000000000004', 'classification-test@example.test');
insert into public.institutions (id, code, name)
values ('71000000-0000-4000-8000-000000000004', 'RULE_TEST', 'Instituição de teste');
insert into public.categories (id, user_id, name, kind)
values ('72000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', 'Categoria sintética', 'expense');
insert into public.accounts (id, user_id, institution_id, name, type)
values ('73000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', '71000000-0000-4000-8000-000000000004', 'Conta sintética', 'checking');
insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values ('74000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', '73000000-0000-4000-8000-000000000004', 'synthetic.csv', 'text/csv', 1, repeat('f', 64), 'bank_statement', 'csv', 'synthetic', '1');
insert into public.transactions (id, user_id, import_id, account_id, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values ('75000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', '74000000-0000-4000-8000-000000000004', '73000000-0000-4000-8000-000000000004', '2026-08-01', 'Mercado sintético', 'mercado sintético', 10, 'outflow', 'unclassified', 'classification-synthetic');
insert into public.allocations (user_id, transaction_id, owner_type, amount)
values ('70000000-0000-4000-8000-000000000004', '75000000-0000-4000-8000-000000000004', 'self', 10);
insert into public.classification_rules (user_id, name, description_contains, priority, category_id, nature)
values ('70000000-0000-4000-8000-000000000004', 'Regra sintética', 'mercado', 10, '72000000-0000-4000-8000-000000000004', 'expense');

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000004';

select lives_ok(
  $$select public.reprocess_transaction_classification('75000000-0000-4000-8000-000000000004')$$,
  'an authenticated user reprocesses a transaction'
);
select is(
  (select category_source::text from public.transactions where id = '75000000-0000-4000-8000-000000000004'),
  'user_rule', 'a user rule becomes the recorded category provenance'
);
select is(
  (select category_id from public.transactions where id = '75000000-0000-4000-8000-000000000004'),
  '72000000-0000-4000-8000-000000000004'::uuid, 'the rule assigns its category'
);
select is(
  (select status::text from public.review_items where transaction_id = '75000000-0000-4000-8000-000000000004' and type = 'category'),
  'resolved', 'category review is independently resolved'
);
update public.transactions set manual_locks = '{"category":true}'::jsonb,
  category_id = null, category_source = 'manual' where id = '75000000-0000-4000-8000-000000000004';
select lives_ok(
  $$select public.reprocess_transaction_classification('75000000-0000-4000-8000-000000000004')$$,
  'the transaction can be reprocessed with a manual lock'
);
select is(
  (select category_id from public.transactions where id = '75000000-0000-4000-8000-000000000004'),
  null::uuid, 'reprocessing does not overwrite a manually locked field'
);

select * from finish();
rollback;
