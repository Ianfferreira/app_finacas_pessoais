begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'user-a@example.test',
    '{"display_name":"Pessoa A"}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'user-b@example.test',
    '{"display_name":"Pessoa B"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'user-c@example.test',
    '{}'::jsonb
  );

-- Keep C as an Auth identity without a profile to exercise the INSERT policy.
delete from public.profiles
where user_id = '30000000-0000-4000-8000-000000000003';

create schema test_helpers;
create function test_helpers.try_insert_profile(target_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (target_user_id);
  return true;
exception
  when insufficient_privilege then
    return false;
end;
$$;

grant usage on schema test_helpers to authenticated;
grant execute on function test_helpers.try_insert_profile(uuid) to authenticated;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'user A sees only one profile'
);

select is(
  (select user_id::text from public.profiles),
  '10000000-0000-4000-8000-000000000001',
  'user A sees only their own row'
);

select lives_ok(
  $$update public.profiles set display_name = 'Pessoa A atualizada' where user_id = '10000000-0000-4000-8000-000000000001'$$,
  'user A can update their own profile'
);

select is(
  (select display_name from public.profiles),
  'Pessoa A atualizada',
  'the own-row update is persisted'
);

select lives_ok(
  $$update public.profiles set display_name = 'Tentativa indevida' where user_id = '20000000-0000-4000-8000-000000000002'$$,
  'an update targeting user B is accepted but affects no inaccessible row'
);

reset role;
select is(
  (select display_name from public.profiles where user_id = '20000000-0000-4000-8000-000000000002'),
  'Pessoa B',
  'user A cannot update user B'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
select lives_ok(
  $$delete from public.profiles where user_id = '20000000-0000-4000-8000-000000000002'$$,
  'a delete targeting user B is accepted but affects no inaccessible row'
);

reset role;
select ok(
  exists (select 1 from public.profiles where user_id = '20000000-0000-4000-8000-000000000002'),
  'user A cannot delete user B'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';

select is(
  test_helpers.try_insert_profile(
    '30000000-0000-4000-8000-000000000003'::uuid
  ),
  false,
  'user A cannot insert a profile for user C'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000002';

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'user B also sees exactly one profile'
);

select is(
  (select user_id::text from public.profiles),
  '20000000-0000-4000-8000-000000000002',
  'user B sees their own row, never user A'
);

reset role;
set local role anon;
set local "request.jwt.claim.sub" = '';

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  'permission denied for table profiles',
  'anonymous requests cannot read profiles'
);

select * from finish();
rollback;
