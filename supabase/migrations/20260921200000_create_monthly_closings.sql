-- Stage 8: versioned, reversible monthly closing. Snapshots describe a close
-- event; they never replace immutable raw evidence or editable transactions.
create type public.monthly_closing_status as enum ('in_progress', 'closed_with_pending', 'closed');

create table public.monthly_closings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  status public.monthly_closing_status not null default 'in_progress',
  version integer not null default 0 check (version >= 0),
  closed_at timestamptz null,
  reopened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, month),
  check ((status = 'in_progress' and closed_at is null) or status <> 'in_progress')
);

create table public.monthly_closing_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_closing_id uuid not null,
  version integer not null check (version > 0),
  status public.monthly_closing_status not null,
  quality_check jsonb not null,
  metrics jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, monthly_closing_id, version),
  foreign key (monthly_closing_id, user_id) references public.monthly_closings(id, user_id) on delete cascade
);

create function public.month_quality_check(target_user_id uuid, target_month date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'open_review_items', (select count(*) from public.review_items r where r.user_id = target_user_id and r.status = 'open' and exists (select 1 from public.transactions t where t.id = r.transaction_id and t.competence_month = target_month)),
    'unclassified_transactions', (select count(*) from public.transactions where user_id = target_user_id and competence_month = target_month and nature = 'unclassified'),
    'unlinked_possible_duplicates', 0,
    'sources_present', (select count(distinct import_id) from public.transactions where user_id = target_user_id and competence_month = target_month)
  );
$$;

create function public.close_month(target_month date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare u uuid := auth.uid(); closing_id uuid; next_version integer; quality jsonb; closing_status public.monthly_closing_status; snapshot jsonb;
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_month <> date_trunc('month', target_month)::date then raise exception 'month must be first day' using errcode = '22023'; end if;
  quality := public.month_quality_check(u, target_month);
  closing_status := case when (quality->>'open_review_items')::integer > 0 or (quality->>'unclassified_transactions')::integer > 0 then 'closed_with_pending' else 'closed' end;
  insert into public.monthly_closings (user_id, month, status, version, closed_at)
  values (u, target_month, closing_status, 1, now())
  on conflict (user_id, month) do update set status = excluded.status, version = public.monthly_closings.version + 1, closed_at = now(), reopened_at = null, updated_at = now()
  returning id, version into closing_id, next_version;
  select jsonb_build_object(
    'income', coalesce(sum(amount) filter (where nature in ('income','investment_income','refund') and direction = 'inflow'), 0),
    'personal_expense', coalesce(sum(amount) filter (where nature = 'expense' and direction = 'outflow'), 0)
  ) into snapshot from public.transactions where user_id = u and competence_month = target_month and not is_void;
  insert into public.monthly_closing_versions (user_id, monthly_closing_id, version, status, quality_check, metrics)
  values (u, closing_id, next_version, closing_status, quality, snapshot);
  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'monthly_closing', closing_id, 'month_closed', jsonb_build_object('month', target_month, 'version', next_version, 'status', closing_status));
  return closing_id;
end;
$$;

create function public.reopen_month(target_month date)
returns void language plpgsql security invoker set search_path = '' as $$
declare u uuid := auth.uid(); closing_id uuid;
begin
  if u is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.monthly_closings set status = 'in_progress', closed_at = null, reopened_at = now(), updated_at = now()
  where user_id = u and month = target_month returning id into closing_id;
  if closing_id is null then raise exception 'month closing not found' using errcode = 'P0002'; end if;
  insert into public.audit_events (user_id, entity_type, entity_id, event_type, payload)
  values (u, 'monthly_closing', closing_id, 'month_reopened', jsonb_build_object('month', target_month));
end;
$$;
create trigger monthly_closings_set_updated_at before update on public.monthly_closings for each row execute procedure public.set_updated_at();
revoke all on function public.month_quality_check(uuid, date) from public;
revoke all on function public.close_month(date) from public;
grant execute on function public.close_month(date) to authenticated;
revoke all on function public.reopen_month(date) from public;
grant execute on function public.reopen_month(date) to authenticated;
do $$ declare table_name text; begin
  foreach table_name in array array['monthly_closings','monthly_closing_versions'] loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;
