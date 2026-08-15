-- Records that an account has completed a landing before, which is the one
-- thing neither signup path can work out for itself. Both the password path
-- and the OAuth callback re-execute on every subsequent sign in for as long as
-- the account stays unapproved, and approved alone cannot tell a first landing
-- from a later one: it reads false in both. This column is the marker that
-- can, claimed atomically by a conditional update in claimSignupSeen rather
-- than compared against a timestamp, because a timestamp comparison's failure
-- mode is silently doing nothing at all, which is worse than the repeats it
-- prevents.
--
-- Two things hang off the claim. The allowlist auto approves an account when
-- it first arrives and never again, so an admin's revoke is not undone by the
-- next sign in. And the admin is told about a pending account once rather than
-- on every login.
alter table user_settings
  add column if not exists signup_seen boolean not null default false;

-- Defence in depth, matching approved. The claim runs through the admin
-- client and never through a user's own session, so only the service role
-- needs to write this column. An account that could clear this for itself
-- could have the allowlist approve it a second time.
revoke update (signup_seen) on user_settings from authenticated;
