-- AI quick entry consent.
--
-- Per user consent for sending typed set text to the parsing API. Off by
-- default, so the feature is inert until the first use notice or the Settings
-- switch turns it on. The column follows the notif_* pattern: additive, not
-- null, with a default, so existing rows need no backfill and a rollback that
-- leaves the column in place is harmless.
alter table user_settings
  add column if not exists ai_quick_entry boolean not null default false;
