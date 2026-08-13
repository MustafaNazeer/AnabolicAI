-- Dashboard insights consent.
--
-- Per user consent for sending recent lifts and weekly counts to the
-- insights API, only on an explicit tap. Off by default, so the feature is
-- inert until the first use notice or the Settings switch turns it on. The
-- column follows the notif_* pattern: additive, not null, with a default,
-- so existing rows need no backfill and a rollback that leaves the column
-- in place is harmless.
alter table user_settings
  add column if not exists ai_insights boolean not null default false;
