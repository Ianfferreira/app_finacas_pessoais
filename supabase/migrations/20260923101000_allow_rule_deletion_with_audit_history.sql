-- A rule may be deleted without erasing its prior applications. The application
-- rows retain their recorded value, source, timestamp, and user; only the
-- optional link to the now-removed editable rule becomes null.

alter table public.classification_rule_applications
  drop constraint classification_rule_applications_rule_id_user_id_fkey;

alter table public.classification_rule_applications
  add constraint classification_rule_applications_rule_id_user_id_fkey
  foreign key (rule_id, user_id)
  references public.classification_rules(id, user_id)
  on delete set null (rule_id);
