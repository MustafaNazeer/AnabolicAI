-- 0006: stop requiring the superseded single RIR column.
--
-- Step one of three in removing it, ordered so production keeps working at
-- every point:
--   1. this migration, which lets a row omit rir
--   2. deploy the build that no longer writes rir
--   3. migration 0007, which drops the column
--
-- Doing it in fewer steps breaks logging either way round: dropping the
-- column while the live build still writes it fails on an unknown column,
-- and removing the write while the column is still NOT NULL and has no
-- default fails on a null violation.
--
-- Safe to apply at any time before the deploy: the currently live build
-- still writes rir on every set, which a nullable column accepts happily.

ALTER TABLE workout_sets ALTER COLUMN rir DROP NOT NULL;
