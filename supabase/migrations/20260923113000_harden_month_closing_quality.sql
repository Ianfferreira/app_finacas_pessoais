-- P0: make monthly quality explicit and prevent an accidental
-- closed_with_pending state. A fully closed month has no outstanding
-- classification, ownership, reconciliation, or duplicate work.
create or replace function public.month_quality_check(
  target_user_id uuid,
  target_month date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with month_transactions as (
    select
      t.id,
      t.amount,
      t.nature,
      t.category_id,
      t.ownership_source,
      coalesce(sum(a.amount) filter (where a.owner_type = 'self'), 0) as self_amount
    from public.transactions t
    left join public.allocations a
      on a.transaction_id = t.id and a.user_id = t.user_id
    where t.user_id = target_user_id
      and t.competence_month = target_month
      and not t.is_void
    group by t.id
  ),
  open_reviews as (
    select r.transaction_id, r.type
    from public.review_items r
    join month_transactions t on t.id = r.transaction_id
    where r.user_id = target_user_id and r.status = 'open'
  ),
  pending_transactions as (
    select t.id
    from month_transactions t
    where (t.nature = 'expense' and t.category_id is null)
       or t.nature = 'unclassified'
       or (t.nature in ('expense', 'reversal') and t.ownership_source in ('unknown', 'parser', 'heuristic', 'ai_suggestion'))
    union
    select transaction_id from open_reviews
  )
  select jsonb_build_object(
    'sources_present', (select count(distinct t.import_id) from public.transactions t where t.user_id = target_user_id and t.competence_month = target_month and not t.is_void),
    'open_review_items', (select count(*) from open_reviews),
    'unclassified_transactions', (select count(*) from month_transactions where nature = 'unclassified'),
    'unclassified_amount', (select coalesce(sum(amount), 0) from month_transactions where nature = 'unclassified'),
    'uncategorized_expenses', (select count(*) from month_transactions where nature = 'expense' and category_id is null),
    'uncategorized_expense_amount', (select coalesce(sum(self_amount), 0) from month_transactions where nature = 'expense' and category_id is null),
    'unresolved_ownership', (select count(*) from month_transactions where nature in ('expense', 'reversal') and ownership_source in ('unknown', 'parser', 'heuristic', 'ai_suggestion')),
    'unresolved_ownership_amount', (select coalesce(sum(amount), 0) from month_transactions where nature in ('expense', 'reversal') and ownership_source in ('unknown', 'parser', 'heuristic', 'ai_suggestion')),
    'unresolved_reconciliations', (select count(*) from open_reviews where type = 'reconciliation'),
    'possible_duplicates', (select count(*) from open_reviews where type = 'possible_duplicate'),
    'unlinked_possible_duplicates', (select count(*) from open_reviews where type = 'possible_duplicate'),
    'pending_count', (select count(*) from pending_transactions),
    'pending_amount', (select coalesce(sum(t.amount), 0) from month_transactions t join pending_transactions p on p.id = t.id)
  );
$$;

create function public.month_closing_quality(target_month date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if target_month <> date_trunc('month', target_month)::date then
    raise exception 'month must be first day' using errcode = '22023';
  end if;
  return public.month_quality_check(u, target_month);
end;
$$;

drop function public.close_month(date);

create function public.close_month(
  target_month date,
  p_confirm_pending boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  closing_id uuid;
  next_version integer;
  quality jsonb;
  closing_status public.monthly_closing_status;
  snapshot jsonb;
  pending_count integer;
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if target_month <> date_trunc('month', target_month)::date then
    raise exception 'month must be first day' using errcode = '22023';
  end if;

  quality := public.month_quality_check(u, target_month);
  pending_count := (quality ->> 'pending_count')::integer;
  if pending_count > 0 and not p_confirm_pending then
    raise exception 'explicit confirmation is required to close a month with pending items' using errcode = '22023';
  end if;
  closing_status := case when pending_count > 0 then 'closed_with_pending' else 'closed' end;

  insert into public.monthly_closings (user_id, month, status, version, closed_at)
  values (u, target_month, closing_status, 1, now())
  on conflict (user_id, month) do update
    set status = excluded.status,
        version = public.monthly_closings.version + 1,
        closed_at = now(),
        reopened_at = null,
        updated_at = now()
  returning id, version into closing_id, next_version;

  select jsonb_build_object('income', income, 'personal_expense', personal_expenses)
  into snapshot
  from public.month_metrics(target_month);

  insert into public.monthly_closing_versions (user_id, monthly_closing_id, version, status, quality_check, metrics)
  values (u, closing_id, next_version, closing_status, quality, snapshot);
  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'monthly_closing', closing_id, 'month_closed', jsonb_build_object(
    'month', target_month,
    'version', next_version,
    'status', closing_status,
    'pending_count', pending_count,
    'pending_amount', quality -> 'pending_amount'
  ));
  return closing_id;
end;
$$;

revoke all on function public.month_closing_quality(date) from public;
grant execute on function public.month_closing_quality(date) to authenticated;
revoke all on function public.close_month(date, boolean) from public;
grant execute on function public.close_month(date, boolean) to authenticated;
