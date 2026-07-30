-- 0007: drop the superseded single RIR column.
--
-- Step three of three. Apply only after 0006 has run AND the build that no
-- longer writes rir is live. By then nothing reads or writes the column, so
-- this is safe to apply before or after any later deploy.
--
-- The values are not lost: 0005 copied every row's rir into rir_low and
-- rir_high before anything started depending on them.

ALTER TABLE workout_sets DROP COLUMN rir;
