-- Distinguishes a first landing from a repeat login by a still pending
-- account. notifyAdminsOfSignup runs from signUp's uninvited branch and from
-- the OAuth callback's open signup branch, and both re-execute on every
-- subsequent attempt for as long as the account remains unapproved, so
-- approved alone cannot tell a first landing from a later sign in: it reads
-- false in both. This column is the marker that can, claimed atomically by a
-- conditional update inside notifyAdminsOfSignup rather than compared
-- against a timestamp, because a timestamp comparison's failure mode is
-- silently never notifying at all, which is worse than the duplicate pings
-- this fixes.
alter table user_settings
  add column if not exists signup_notified boolean not null default false;

-- Defence in depth, matching approved. The claim runs through the admin
-- client and never through a user's own session, so only the service role
-- needs to write this column.
revoke update (signup_notified) on user_settings from authenticated;
