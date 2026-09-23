begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email)
values
  ('71000000-0000-4000-8000-000000000001', 'ownership-a@example.test'),
  ('72000000-0000-4000-8000-000000000002', 'ownership-b@example.test');

insert into public.institutions (id, code, name)
values ('73000000-0000-4000-8000-000000000001', 'OWNERSHIP_TEST', 'Instituição sintética de rateio');

insert into public.accounts (id, user_id, institution_id, name, type)
values (
  '74000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  'Conta sintética de rateio',
  'checking'
);

insert into public.imports (id, user_id, account_id, original_filename, mime_type, size_bytes, sha256, source_kind, format, parser_name, parser_version)
values (
  '75000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  'ownership.csv', 'text/csv', 1, repeat('7', 64), 'bank_statement', 'csv', 'synthetic', '1'
);

insert into public.transactions (id, user_id, import_id, account_id, occurred_on, competence_month, description_raw, description_normalized, amount, direction, nature, dedupe_key)
values (
  '76000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  '2026-09-10', '2026-09-01', 'Despesa sintética compartilhada', 'despesa sintética compartilhada',
  100.01, 'outflow', 'expense', 'ownership-expense'
), (
  '76100000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  '2026-09-11', '2026-09-01', 'Estorno sintético compartilhado', 'estorno sintético compartilhado',
  100.01, 'inflow', 'reversal', 'ownership-reversal'
);

insert into public.allocations (user_id, transaction_id, owner_type, amount, source)
values
  ('71000000-0000-4000-8000-000000000001', '76000000-0000-4000-8000-000000000001', 'self', 100.01, 'parser'),
  ('71000000-0000-4000-8000-000000000001', '76100000-0000-4000-8000-000000000001', 'self', 100.01, 'parser');

insert into public.people (id, user_id, full_name)
values
  ('77000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Pessoa sintética um'),
  ('77100000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Pessoa sintética dois'),
  ('77200000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002', 'Pessoa sintética externa');

set local role authenticated;
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.set_transaction_ownership(
    '76000000-0000-4000-8000-000000000001',
    'percentage',
    '[
      {"ownerType":"self","percentage":"50"},
      {"ownerType":"third_party","personId":"77000000-0000-4000-8000-000000000001","percentage":"25"},
      {"ownerType":"third_party","personId":"77100000-0000-4000-8000-000000000001","percentage":"25"}
    ]'::jsonb
  )$$,
  'percentage ownership split is accepted'
);
select is(
  (select amount from public.allocations where transaction_id = '76000000-0000-4000-8000-000000000001' and owner_type = 'self'),
  50.01::numeric,
  'residual cent follows declaration order'
);
select is(
  (select sum(amount) from public.allocations where transaction_id = '76000000-0000-4000-8000-000000000001'),
  100.01::numeric,
  'percentage split conserves the transaction amount exactly'
);
select is(
  (select sum(amount) from public.third_party_entries where transaction_id = '76000000-0000-4000-8000-000000000001' and kind = 'charge'),
  50.00::numeric,
  'third-party share becomes a positive receivable'
);
select is(
  (select personal_expenses from public.month_metrics('2026-09-01')),
  (-50.00)::numeric,
  'monthly metric continues to include the still-unsplit reversal'
);
select is(
  (select ownership_source from public.transactions where id = '76000000-0000-4000-8000-000000000001'),
  'manual'::public.decision_source,
  'ownership source records the manual decision'
);
select ok(
  (select coalesce((manual_locks ->> 'ownership')::boolean, false) from public.transactions where id = '76000000-0000-4000-8000-000000000001'),
  'ownership decision is manually locked'
);
select is(
  (select status from public.review_items where transaction_id = '76000000-0000-4000-8000-000000000001' and type = 'ownership'),
  'resolved'::public.review_item_status,
  'ownership review is resolved atomically'
);
select is(
  (select count(*) from public.audit_events where entity_id = '76000000-0000-4000-8000-000000000001' and event_type = 'ownership_set_manually'),
  1::bigint,
  'ownership decision has an audit event'
);
select lives_ok(
  $$select public.set_transaction_ownership(
    '76100000-0000-4000-8000-000000000001',
    'amount',
    '[
      {"ownerType":"self","amount":"40.01"},
      {"ownerType":"third_party","personId":"77000000-0000-4000-8000-000000000001","amount":"60.00"}
    ]'::jsonb
  )$$,
  'exact-amount split works for a reversal'
);
select is(
  (select amount from public.third_party_entries where transaction_id = '76100000-0000-4000-8000-000000000001' and kind = 'adjustment'),
  (-60.00)::numeric,
  'third-party reversal becomes a negative ledger adjustment'
);
select is(
  (select personal_expenses from public.month_metrics('2026-09-01')),
  10.00::numeric,
  'monthly personal expense uses only the self portions after both splits'
);
select throws_ok(
  $$select public.set_transaction_ownership(
    '76000000-0000-4000-8000-000000000001',
    'percentage',
    '[{"ownerType":"self","percentage":"99"}]'::jsonb
  )$$,
  '22023', 'percentages must sum exactly to 100',
  'incomplete percentage split is rejected'
);
select throws_ok(
  $$select public.set_transaction_ownership(
    '76000000-0000-4000-8000-000000000001',
    'amount',
    '[
      {"ownerType":"self","amount":"50.00"},
      {"ownerType":"third_party","personId":"77200000-0000-4000-8000-000000000001","amount":"50.01"}
    ]'::jsonb
  )$$,
  'P0002', 'person not found',
  'another user person cannot enter the split'
);

select * from finish();
rollback;
