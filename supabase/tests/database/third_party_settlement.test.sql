begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values ('b1000000-0000-4000-8000-000000000001', 'settlement-a@example.test'), ('b2000000-0000-4000-8000-000000000002', 'settlement-b@example.test');
insert into public.people (id, user_id, full_name) values ('b3000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Pessoa sintética A'), ('b3010000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', 'Pessoa sintética B');
insert into public.third_party_entries (id, user_id, person_id, kind, amount, occurred_on) values
  ('b4000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'charge', 70.00, '2026-09-01'),
  ('b4010000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'charge', 30.00, '2026-09-02');

set local role authenticated;
set local "request.jwt.claim.sub" = 'b1000000-0000-4000-8000-000000000001';
select lives_ok($$select public.record_third_party_settlement('b3000000-0000-4000-8000-000000000001', 60.00, '2026-09-03', 'PIX sintético', '[{"entryId":"b4000000-0000-4000-8000-000000000001","amount":"40.00"},{"entryId":"b4010000-0000-4000-8000-000000000001","amount":"20.00"}]')$$, 'partial settlement across two charges is accepted');
select is((select count(*) from public.settlements), 1::bigint, 'settlement is persisted once');
select is((select sum(amount) from public.settlement_allocations), 60.00::numeric, 'allocations preserve the received amount');
select is((select sum(amount) from public.third_party_entries where kind = 'settlement'), (-60.00)::numeric, 'settlement reduces the ledger balance');
select is((select sum(amount) from public.third_party_entries), 40.00::numeric, 'partial settlement leaves the correct receivable');
select is((select count(*) from public.audit_events where event_type = 'third_party_settlement_recorded'), 1::bigint, 'settlement is audited');
select throws_ok($$select public.record_third_party_settlement('b3000000-0000-4000-8000-000000000001', 50.00, '2026-09-04', null, '[{"entryId":"b4000000-0000-4000-8000-000000000001","amount":"50.00"}]')$$, '23514', 'settlement allocation exceeds the open receivable', 'cannot settle more than the remaining amount of a charge');
select throws_ok($$select public.record_third_party_settlement('b3000000-0000-4000-8000-000000000001', 31.00, '2026-09-04', null, '[{"entryId":"b4000000-0000-4000-8000-000000000001","amount":"31.00"}]')$$, '23514', 'settlement allocation exceeds the open receivable', 'already allocated amount is protected');
select throws_ok($$select public.record_third_party_settlement('b3010000-0000-4000-8000-000000000001', 1.00, '2026-09-04', null, '[{"entryId":"b4000000-0000-4000-8000-000000000001","amount":"1.00"}]')$$, 'P0002', 'person not found', 'another user person is inaccessible');
select lives_ok($$select public.record_manual_third_party_entry('b3000000-0000-4000-8000-000000000001', 'reimbursement', 5.00, '2026-09-04', 'Crédito sintético')$$, 'explicit credit can be recorded separately');
select is((select count(*) from public.audit_events where event_type = 'third_party_entry_recorded_manually'), 1::bigint, 'manual credit is audited');
select * from finish();
rollback;
