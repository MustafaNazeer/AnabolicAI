-- 0006: drop the superseded single RIR column.
-- Apply only after 0005 has been live long enough to confirm rir_low and
-- rir_high are correct on real logged data. Nothing reads rir by then, so
-- this is safe to apply before or after any deploy.

ALTER TABLE workout_sets DROP COLUMN rir;
