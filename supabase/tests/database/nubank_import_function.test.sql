begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
insert into auth.users (id, email) values ('70000000-0000-4000-8000-000000000001', 'import-test@example.test');
set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.import_nubank_statement_csv(repeat('e', 64), 'synthetic.csv', 10, '70000000-0000-4000-8000-000000000001/synthetic.csv', '[{"rowNumber":2,"occurredOn":"2026-08-01","signedAmount":"-10.00","externalId":"synthetic-1","descriptionRaw":"Synthetic"}]'::jsonb)$$,
  'the authenticated user imports a synthetic Nubank statement atomically'
);
select * from finish();
rollback;
