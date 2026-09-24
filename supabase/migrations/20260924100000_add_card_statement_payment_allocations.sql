-- P0: a card payment and a card statement are distinct financial evidence.
-- This narrow join model supports partial payments and documented zero-due
-- statements without turning the payment into a new expense.
create table public.card_statement_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_statement_id uuid not null,
  payment_transaction_id uuid not null,
  amount numeric(18, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, card_statement_id, payment_transaction_id),
  foreign key (card_statement_id, user_id)
    references public.card_statements(id, user_id) on delete restrict,
  foreign key (payment_transaction_id, user_id)
    references public.transactions(id, user_id) on delete restrict
);

create index card_statement_payment_allocations_statement_idx
  on public.card_statement_payment_allocations (user_id, card_statement_id);
create index card_statement_payment_allocations_transaction_idx
  on public.card_statement_payment_allocations (user_id, payment_transaction_id);

create function public.sync_card_payment_reconciliation_review(
  p_user_id uuid,
  p_payment_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.transactions%rowtype;
  allocated_amount numeric(18, 2);
begin
  select * into payment
  from public.transactions
  where id = p_payment_transaction_id and user_id = p_user_id;
  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0) into allocated_amount
  from public.card_statement_payment_allocations
  where user_id = p_user_id and payment_transaction_id = payment.id;

  if not payment.is_void
    and payment.nature = 'card_payment'
    and allocated_amount < payment.amount then
    insert into public.review_items (user_id, transaction_id, type, status, detail)
    values (
      p_user_id,
      payment.id,
      'reconciliation',
      'open',
      jsonb_build_object(
        'reason', 'card_payment_unallocated',
        'payment_amount', payment.amount,
        'allocated_amount', allocated_amount,
        'remaining_amount', payment.amount - allocated_amount
      )
    )
    on conflict (user_id, transaction_id, type) do update
    set status = 'open',
        detail = excluded.detail,
        resolved_at = null,
        updated_at = now();
  else
    update public.review_items
    set status = 'resolved',
        resolved_at = now(),
        updated_at = now()
    where user_id = p_user_id
      and transaction_id = p_payment_transaction_id
      and type = 'reconciliation'
      and detail ->> 'reason' = 'card_payment_unallocated';
  end if;
end;
$$;

create function public.sync_card_payment_reconciliation_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.user_id = auth.uid() then
    perform public.sync_card_payment_reconciliation_review(new.user_id, new.id);
  end if;
  return new;
end;
$$;

create trigger transactions_sync_card_payment_reconciliation
after insert or update of nature, amount, is_void on public.transactions
for each row execute procedure public.sync_card_payment_reconciliation_after_change();

create function public.record_card_statement_payment_allocation(
  p_card_statement_id uuid,
  p_payment_transaction_id uuid,
  p_amount numeric(18, 2)
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  statement public.card_statements%rowtype;
  payment public.transactions%rowtype;
  payment_allocated numeric(18, 2);
  statement_allocated numeric(18, 2);
  allocation_id uuid;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_amount <= 0 then
    raise exception 'allocation amount must be positive' using errcode = '22023';
  end if;

  select * into statement
  from public.card_statements
  where id = p_card_statement_id and user_id = u
  for update;
  if not found then
    raise exception 'card statement not found' using errcode = 'P0002';
  end if;

  select * into payment
  from public.transactions
  where id = p_payment_transaction_id and user_id = u
  for update;
  if not found then
    raise exception 'payment transaction not found' using errcode = 'P0002';
  end if;
  if payment.is_void or payment.nature <> 'card_payment' then
    raise exception 'transaction is not an active card payment' using errcode = '22023';
  end if;

  select coalesce(sum(amount), 0) into payment_allocated
  from public.card_statement_payment_allocations
  where user_id = u and payment_transaction_id = payment.id;
  if payment_allocated + p_amount > payment.amount then
    raise exception 'payment allocation exceeds transaction amount' using errcode = '22023';
  end if;

  -- A zero-due statement is valid evidence of an advance payment. In that
  -- case, total_due cannot cap the allocation. Positive documented totals do.
  select coalesce(sum(amount), 0) into statement_allocated
  from public.card_statement_payment_allocations
  where user_id = u and card_statement_id = statement.id;
  if statement.total_due is not null
    and statement.total_due > 0
    and statement_allocated + p_amount > statement.total_due then
    raise exception 'statement allocation exceeds documented amount' using errcode = '22023';
  end if;

  insert into public.card_statement_payment_allocations (
    user_id, card_statement_id, payment_transaction_id, amount
  ) values (
    u, statement.id, payment.id, p_amount
  ) returning id into allocation_id;

  perform public.sync_card_payment_reconciliation_review(u, payment.id);

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'card_statement_payment_allocation', allocation_id, 'card_statement_payment_allocated', jsonb_build_object(
    'card_statement_id', statement.id,
    'payment_transaction_id', payment.id,
    'amount', p_amount
  ));
  return allocation_id;
end;
$$;

create function public.remove_card_statement_payment_allocation(
  p_allocation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  allocation public.card_statement_payment_allocations%rowtype;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into allocation
  from public.card_statement_payment_allocations
  where id = p_allocation_id and user_id = u
  for update;
  if not found then
    raise exception 'card payment allocation not found' using errcode = 'P0002';
  end if;

  delete from public.card_statement_payment_allocations
  where id = allocation.id and user_id = u;
  perform public.sync_card_payment_reconciliation_review(u, allocation.payment_transaction_id);

  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'card_statement_payment_allocation', allocation.id, 'card_statement_payment_allocation_removed', jsonb_build_object(
    'card_statement_id', allocation.card_statement_id,
    'payment_transaction_id', allocation.payment_transaction_id,
    'amount', allocation.amount
  ));
end;
$$;

-- Existing imported payments become explicit review work after this migration.
insert into public.review_items (user_id, transaction_id, type, status, detail)
select
  payment.user_id,
  payment.id,
  'reconciliation',
  'open',
  jsonb_build_object(
    'reason', 'card_payment_unallocated',
    'payment_amount', payment.amount,
    'allocated_amount', 0,
    'remaining_amount', payment.amount
  )
from public.transactions payment
where not payment.is_void
  and payment.nature = 'card_payment'
on conflict (user_id, transaction_id, type) do nothing;

revoke all on function public.sync_card_payment_reconciliation_review(uuid, uuid) from public;
revoke all on function public.sync_card_payment_reconciliation_after_change() from public;
revoke all on function public.record_card_statement_payment_allocation(uuid, uuid, numeric) from public;
grant execute on function public.record_card_statement_payment_allocation(uuid, uuid, numeric) to authenticated;
revoke all on function public.remove_card_statement_payment_allocation(uuid) from public;
grant execute on function public.remove_card_statement_payment_allocation(uuid) to authenticated;

revoke all on table public.card_statement_payment_allocations from anon, authenticated;
grant select on table public.card_statement_payment_allocations to authenticated;
alter table public.card_statement_payment_allocations enable row level security;
alter table public.card_statement_payment_allocations force row level security;
create policy card_statement_payment_allocations_select_own
  on public.card_statement_payment_allocations for select to authenticated
  using ((select auth.uid()) = user_id);
