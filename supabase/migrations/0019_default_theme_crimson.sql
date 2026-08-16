-- The default accent moves from cobalt to crimson, 2026-08-15.
--
-- Two parts, and the second is deliberately destructive of a user choice.
-- Mustafa asked for existing accounts to move too, not just new ones, so any
-- row still sitting on cobalt is switched. A user who had deliberately picked
-- cobalt is indistinguishable in the data from one who never opened the theme
-- picker, so both move.
--
-- NOT IDEMPOTENT, and that is the thing to know before re-running it. Applying
-- this a second time would convert anyone who has since chosen cobalt back to
-- crimson. Same trap 0014 and 0015 set. Run it exactly once.
--
-- No column is added, so no column level grant is needed. The privilege rule
-- from 0018 does not apply here.

alter table user_settings alter column theme set default 'crimson';

update user_settings set theme = 'crimson' where theme = 'cobalt';
