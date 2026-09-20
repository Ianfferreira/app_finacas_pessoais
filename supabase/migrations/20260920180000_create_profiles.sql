-- Stage 0 foundation: the authenticated user's isolated application profile.
-- Financial entities intentionally belong to later stages.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text null check (
    display_name is null or char_length(display_name) between 1 and 120
  ),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Sao_Paulo' check (
    char_length(trim(timezone)) > 0
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user preferences created with the Supabase Auth identity.';
comment on column public.profiles.currency is
  'ISO 4217 display preference; BRL is the configurable V1 default.';
comment on column public.profiles.timezone is
  'IANA time zone preference; America/Sao_Paulo is the configurable V1 default.';

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    case
      when char_length(
        trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''))
      ) between 1 and 120
        then trim(new.raw_user_meta_data ->> 'display_name')
      else null
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- A remote project may already contain Auth identities when this baseline lands.
insert into public.profiles (user_id, display_name)
select
  auth_user.id,
  case
    when char_length(
      trim(coalesce(auth_user.raw_user_meta_data ->> 'display_name', ''))
    ) between 1 and 120
      then trim(auth_user.raw_user_meta_data ->> 'display_name')
    else null
  end
from auth.users as auth_user
on conflict (user_id) do nothing;

revoke all on table public.profiles from anon;
grant select, insert, update, delete on table public.profiles to authenticated;
revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);
