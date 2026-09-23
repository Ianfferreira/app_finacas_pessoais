-- Financial metrics must use the economic interpretation and the exact
-- allocation attributed to the account owner. Bank direction alone is not a
-- substitute: a reversal can be a neutral source movement and still reduce a
-- personal expense.

create function public.month_metrics(target_month date)
returns table (
  income numeric(18, 2),
  personal_expenses numeric(18, 2)
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare u uuid := auth.uid();
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  return query
  select
    coalesce(sum(t.amount) filter (
      where t.nature in ('income', 'investment_income')
    ), 0)::numeric(18, 2) as income,
    coalesce(sum(
      case t.nature
        when 'expense' then owner_amount.self_amount
        when 'reversal' then -owner_amount.self_amount
        else 0
      end
    ), 0)::numeric(18, 2) as personal_expenses
  from public.transactions t
  cross join lateral (
    select coalesce(sum(a.amount) filter (where a.owner_type = 'self'), 0)
      as self_amount
    from public.allocations a
    where a.user_id = t.user_id and a.transaction_id = t.id
  ) owner_amount
  where t.user_id = u
    and t.competence_month = target_month
    and not t.is_void;
end;
$$;

create function public.monthly_metrics_history()
returns table (
  competence_month date,
  income numeric(18, 2),
  personal_expenses numeric(18, 2)
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare u uuid := auth.uid();
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  return query
  select
    t.competence_month,
    coalesce(sum(t.amount) filter (
      where t.nature in ('income', 'investment_income')
    ), 0)::numeric(18, 2),
    coalesce(sum(
      case t.nature
        when 'expense' then owner_amount.self_amount
        when 'reversal' then -owner_amount.self_amount
        else 0
      end
    ), 0)::numeric(18, 2)
  from public.transactions t
  cross join lateral (
    select coalesce(sum(a.amount) filter (where a.owner_type = 'self'), 0)
      as self_amount
    from public.allocations a
    where a.user_id = t.user_id and a.transaction_id = t.id
  ) owner_amount
  where t.user_id = u and not t.is_void
  group by t.competence_month
  order by t.competence_month desc;
end;
$$;

create function public.month_category_metrics(target_month date)
returns table (
  category_name text,
  personal_expenses numeric(18, 2)
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare u uuid := auth.uid();
begin
  if u is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  return query
  select
    coalesce(c.name, 'Sem categoria') as category_name,
    coalesce(sum(
      case t.nature
        when 'expense' then owner_amount.self_amount
        when 'reversal' then -owner_amount.self_amount
        else 0
      end
    ), 0)::numeric(18, 2) as personal_expenses
  from public.transactions t
  left join public.categories c on c.id = t.category_id and c.user_id = t.user_id
  cross join lateral (
    select coalesce(sum(a.amount) filter (where a.owner_type = 'self'), 0)
      as self_amount
    from public.allocations a
    where a.user_id = t.user_id and a.transaction_id = t.id
  ) owner_amount
  where t.user_id = u
    and t.competence_month = target_month
    and not t.is_void
    and t.nature in ('expense', 'reversal')
  group by c.name
  having coalesce(sum(
    case t.nature
      when 'expense' then owner_amount.self_amount
      when 'reversal' then -owner_amount.self_amount
      else 0
    end
  ), 0) <> 0
  order by personal_expenses desc, category_name;
end;
$$;

create or replace function public.close_month(target_month date)
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
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_month <> date_trunc('month', target_month)::date then raise exception 'month must be first day' using errcode = '22023'; end if;
  quality := public.month_quality_check(u, target_month);
  closing_status := case when (quality->>'open_review_items')::integer > 0 or (quality->>'unclassified_transactions')::integer > 0 then 'closed_with_pending' else 'closed' end;
  insert into public.monthly_closings (user_id, month, status, version, closed_at)
  values (u, target_month, closing_status, 1, now())
  on conflict (user_id, month) do update set status = excluded.status, version = public.monthly_closings.version + 1, closed_at = now(), reopened_at = null, updated_at = now()
  returning id, version into closing_id, next_version;
  select jsonb_build_object('income', income, 'personal_expense', personal_expenses)
    into snapshot
  from public.month_metrics(target_month);
  insert into public.monthly_closing_versions (user_id, monthly_closing_id, version, status, quality_check, metrics)
  values (u, closing_id, next_version, closing_status, quality, snapshot);
  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'monthly_closing', closing_id, 'month_closed', jsonb_build_object('month', target_month, 'version', next_version, 'status', closing_status));
  return closing_id;
end;
$$;

revoke all on function public.month_metrics(date) from public;
grant execute on function public.month_metrics(date) to authenticated;
revoke all on function public.monthly_metrics_history() from public;
grant execute on function public.monthly_metrics_history() to authenticated;
revoke all on function public.month_category_metrics(date) from public;
grant execute on function public.month_category_metrics(date) to authenticated;
