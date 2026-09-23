begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email)
values ('70000000-0000-4000-8000-000000000002', 'card-import-test@example.test');

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';

select lives_ok(
  $$select public.import_card_statement(
    repeat('c', 64), 'synthetic-card.pdf', 'application/pdf', 10,
    '70000000-0000-4000-8000-000000000002/synthetic-card.pdf',
    'CAIXA', 'synthetic-card-pdf', '1', '2026-08-01', '2026-08-31', '2026-09-10',
    '["1234"]'::jsonb,
    '[
      {"sourceRowNumber":2,"cardLastFour":"1234","occurredOn":"2026-08-20","purchaseDate":"2026-08-20","competenceMonth":"2026-08-01","descriptionRaw":"Compra sintética 2 de 3","amount":"99.99","kind":"purchase","installment":{"number":2,"total":3},"sourceGroupKey":"synthetic-card-group","rawPayload":{}},
      {"sourceRowNumber":3,"cardLastFour":"1234","occurredOn":"2026-08-21","purchaseDate":"2026-08-21","competenceMonth":"2026-08-01","descriptionRaw":"Compra simples sintética","amount":"10.00","kind":"purchase","installment":null,"rawPayload":{}},
      {"sourceRowNumber":4,"cardLastFour":"1234","occurredOn":"2026-09-05","purchaseDate":null,"competenceMonth":"2026-08-01","descriptionRaw":"Pagamento da fatura","amount":"109.99","kind":"payment","installment":null,"rawPayload":{}}
    ]'::jsonb
  )$$,
  'an authenticated user atomically imports a synthetic card statement'
);

select is(
  (select count(*)::integer from public.card_statements), 1,
  'the statement is associated with its created card'
);
select is(
  (select count(*)::integer from public.transactions), 3,
  'installment, ordinary purchase, and payment become distinct movements'
);
select is(
  (select nature::text from public.transactions where description_raw = 'Pagamento da fatura'),
  'card_payment',
  'a card payment is not persisted as a new expense'
);
select is(
  (select count(*)::integer from public.installments where status = 'realized'), 1,
  'the billed installment is realized'
);
select is(
  (select count(*)::integer from public.installments where status = 'scheduled'), 1,
  'the known future installment is scheduled'
);
select is(
  (select count(*)::integer from public.installment_groups), 1,
  'an ordinary purchase with JSON null installment does not create an installment group'
);

select * from finish();
rollback;
