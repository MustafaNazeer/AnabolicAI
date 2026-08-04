-- Background rest notification.
--
-- notif_rest_timer is NOT reused here. It was repurposed on 2026-08-03 as the
-- local "Sound" setting, which controls a beep while the app is open and is
-- deliberately ungated by notif_master. A push toggle is a different
-- preference and needs its own column.
alter table user_settings
  add column if not exists notif_rest_push boolean not null default true;

-- The live rest for a session. A session has at most one, so these sit on the
-- session rather than in a table of their own.
--
-- rest_token is what makes the delivery check work: every start mints a fresh
-- one, so a message scheduled for an abandoned rest arrives carrying a token
-- the session no longer holds and is dropped.
alter table workout_sessions
  add column if not exists rest_ends_at timestamptz;

alter table workout_sessions
  add column if not exists rest_token uuid;
