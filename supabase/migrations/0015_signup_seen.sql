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

-- Every account that predates this migration has landed before, by definition,
-- so the marker is set for all of them, mirroring how 0014 grandfathers
-- approved immediately after adding it. Without this, an account created
-- before the branch could be revoked by the admin and then re-approve itself on
-- its next allowlisted sign in, because the claim would still be there to take.
-- 0014 has already approved every one of these rows by the time this runs, so
-- none of them is waiting on an announcement this could swallow.
--
-- Unconditional, like 0014's, and so also not to be re-run: a second run would
-- mark an account that has not landed yet and silence its announcement. Unlike
-- 0014's it cannot grant anything, since every use of this marker fails towards
-- doing nothing.
update user_settings set signup_seen = true;

-- Defence in depth, matching approved. The claim runs through the admin
-- client and never through a user's own session, so only the service role
-- needs to write this column. An account that could clear this for itself
-- could have the allowlist approve it a second time.
revoke update (signup_seen) on user_settings from authenticated;
