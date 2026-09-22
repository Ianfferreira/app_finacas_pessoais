begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email)
values ('70000000-0000-4000-8000-000000000003', 'nubank-pdf-test@example.test');

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000003';

select lives_ok(
  $$select public.import_nubank_statement_pdf(
    repeat('d', 64), 'synthetic-nubank.pdf', 10,
    '70000000-0000-4000-8000-000000000003/synthetic-nubank.pdf',
    '[{"rowNumber":4,"occurredOn":"2026-08-03","signedAmount":"-12.34","externalId":"synthetic-pdf-1","descriptionRaw":"Compra sintética"}]'::jsonb
  )$$,
  'the authenticated user imports a synthetic Nubank PDF statement'
);
select is(
  (select format::text from public.imports), 'pdf',
  'the immutable import evidence retains its PDF format'
);
select is(
  (select parser_name from public.imports), 'nubank-statement-pdf',
  'the explicit PDF adapter is recorded as provenance'
);

select * from finish();
rollback;
