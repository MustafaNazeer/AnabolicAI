-- Account approval. Signup can be opened to anyone (see OPEN_SIGNUP), so an
-- account may now exist without having been invited. This column decides
-- whether it may use the three features that spend money at Anthropic. It
-- deliberately gates nothing else: an unapproved account logs workouts and
-- reads its own progress normally, and RLS remains what keeps its rows its own.
alter table user_settings
  add column if not exists approved boolean not null default false;

-- Grandfather everyone who predates this branch, the demo account included.
-- Unconditional and immediately after the add, so no existing account can find
-- itself locked out of a feature it was already using.
--
-- WARNING: this one statement makes the file unsafe to re-run. The rest of it
-- is idempotent, but this update carries no condition and cannot have one: on
-- first run every row it touches is a grandfathered account, and afterwards it
-- cannot tell those apart from an account the admin has deliberately revoked.
-- Running the file a second time would approve every revoked account in the
-- database. The grandfathering is correct on first run, which is the only run
-- it is meant to have.
update user_settings set approved = true;

-- Defence in depth. The user facing settings writes go through the anon key
-- under RLS, and the existing policy lets a user update their own row, so a
-- future settings action that passed an unexpected key through an upsert could
-- otherwise promote its own account. The admin path uses the service role,
-- which this does not affect. INSERT is untouched, so the upserts that create a
-- settings row still work and simply take the default.
revoke update (approved) on user_settings from authenticated;

-- Whether the admin is pushed a notification when an account lands unapproved.
-- Defaults true so an admin who sets ADMIN_EMAILS gets them without further
-- configuration. It still respects notif_master like every other type, and
-- notif_master defaults false.
alter table user_settings
  add column if not exists notif_new_account boolean not null default true;
