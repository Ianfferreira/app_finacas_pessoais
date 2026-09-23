begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email)
values ('81000000-0000-4000-8000-000000000001', 'closing-quality@example.test');

insert into public.institutions (id, code, name)
values ('82000000-0000-4000-8000-000000000001', 'CLOSING_TEST', 'Instituição sintética de fechamento');

insert into public.categories (id, user_id, name, kind)
values ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'Categoria sintética', 'expense');

insert into public.accounts (id, user_id, institution_id, name, type)
values ('84000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'Conta sintética de fechamento', 'checking');

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values ('85000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 'closing.csv', 'text/csv', 1, repeat('8', 64), 'bank_statement', 'csv', 'synthetic', '1');

insert into public.transactions (id, user_id, import_id, account_id, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values
  ('86000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', '2026-09-01', 'Despesa sem revisão', 'despesa sem revisão', 100.00, 'outflow', 'expense', 'closing-expense'),
  ('86100000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', '2026-09-01', 'Entrada sem natureza', 'entrada sem natureza', 40.00, 'inflow', 'unclassified', 'closing-unclassified');

insert into public.allocations (user_id, transaction_id, owner_type, amount, source)
values
  ('81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000001', 'self', 100.00, 'parser'),
  ('81000000-0000-4000-8000-000000000001', '86100000-0000-4000-8000-000000000001', 'self', 40.00, 'parser');

insert into public.review_items (user_id, transaction_id, type, detail)
values ('81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000001', 'possible_duplicate', '{"reason":"synthetic"}');

set local role authenticated;
set local "request.jwt.claim.sub" = '81000000-0000-4000-8000-000000000001';

select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'pending_count')::integer),
  2,
  'quality counts affected transactions once even with multiple pending dimensions'
);
select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'pending_amount')::numeric),
  140.00::numeric,
  'quality reports the total monetary value affected by pending work'
);
select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'uncategorized_expenses')::integer),
  1,
  'quality exposes uncategorized expenses separately'
);
select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'unresolved_ownership')::integer),
  1,
  'quality requires ownership confirmation for expenses'
);
select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'possible_duplicates')::integer),
  1,
  'quality exposes possible duplicates separately'
);
select throws_ok(
  $$select public.close_month('2026-09-01')$$,
  '22023', 'explicit confirmation is required to close a month with pending items',
  'closing with pending work requires explicit confirmation'
);
select lives_ok(
  $$select public.close_month('2026-09-01', true)$$,
  'confirmed close with pending work is recorded'
);
select is(
  (select status from public.monthly_closings where month = '2026-09-01'),
  'closed_with_pending'::public.monthly_closing_status,
  'confirmed pending close uses the correct state'
);
select is(
  (select (quality_check ->> 'pending_count')::integer from public.monthly_closing_versions where version = 1),
  2,
  'closing version snapshots the measured quality'
);

update public.transactions
set category_id = '83000000-0000-4000-8000-000000000001', ownership_source = 'manual', manual_locks = '{"ownership":true}'
where id = '86000000-0000-4000-8000-000000000001';
update public.transactions
set nature = 'income', nature_source = 'manual', manual_locks = '{"nature":true}'
where id = '86100000-0000-4000-8000-000000000001';
update public.review_items
set status = 'resolved', resolved_at = now()
where transaction_id = '86000000-0000-4000-8000-000000000001';

select is(
  (select (public.month_closing_quality('2026-09-01') ->> 'pending_count')::integer),
  0,
  'quality becomes clean once each required dimension is resolved'
);
select lives_ok(
  $$select public.close_month('2026-09-01')$$,
  'a clean month closes without pending confirmation'
);
select is(
  (select status from public.monthly_closings where month = '2026-09-01'),
  'closed'::public.monthly_closing_status,
  'clean month receives the closed state'
);
select is(
  (select version from public.monthly_closings where month = '2026-09-01'),
  2,
  'closing again creates a new immutable closing version'
);

select * from finish();
rollback;
