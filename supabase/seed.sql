-- Synthetic placeholder only. It intentionally has no password and cannot sign in.
-- Create a login-capable local user through Studio when validating the UI manually.
insert into auth.users (id, email, raw_user_meta_data)
values (
  'd0e3c8f0-1234-5678-9abc-def012345678',
  'foundation-user@example.test',
  '{"display_name":"Usuário sintético"}'::jsonb
)
on conflict (id) do nothing;
