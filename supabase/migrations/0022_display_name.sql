-- What to call this account on screen. Before this column the dashboard
-- greeted people with the local part of their email address, so an account
-- signed up as mustafa.nazeer06@gmail.com read "Welcome back, mustafa.nazeer06".
--
-- NULLABLE WITH NO DEFAULT, AND THAT IS LOAD BEARING. Null means never asked,
-- which is what makes the prompt a one time question. An empty string means
-- asked and declined, and both fall back to the old email based greeting. If
-- this defaulted to '' the app could never tell the two apart and would either
-- nag forever or never ask at all.
alter table user_settings
  add column if not exists display_name text;

-- Mirrored by MAX_DISPLAY_NAME in src/lib/profile/name.ts, which refuses a long
-- name first so the message shown is this app's rather than a raw constraint
-- violation. The constraint is still the thing that guarantees it.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_display_name_length'
  ) then
    alter table user_settings
      add constraint user_settings_display_name_length
      check (display_name is null or char_length(display_name) <= 40);
  end if;
end $$;

-- BOTH PRIVILEGES, AND THE CONTRAST WITH 0020 IS THE POINT.
--
-- week_planner is a gate an admin sets, so it is granted select and
-- deliberately never update: the absence of the write privilege is what stops
-- an account letting itself through. This column is the opposite kind of thing.
-- It is the person's own name for their own greeting, it carries no authority,
-- and its owner must be able to write it, exactly like ai_visible in 0018.
--
-- EXPLICIT RATHER THAN ASSUMED. 0017 added a column with no grant and broke
-- every settings write on the live app until 0018 supplied one, because this
-- table no longer carries table level grants for every privilege, only per
-- column ones, and a column created afterwards is covered by none of them.
grant select (display_name) on user_settings to authenticated;
grant update (display_name) on user_settings to authenticated;

-- Verification, expecting TRUE for both, which is the pairing that
-- distinguishes an own preference from a gate:
--
--   select
--     has_column_privilege('authenticated', 'public.user_settings',
--                          'display_name', 'select') as can_read,
--     has_column_privilege('authenticated', 'public.user_settings',
--                          'display_name', 'update') as can_write;
