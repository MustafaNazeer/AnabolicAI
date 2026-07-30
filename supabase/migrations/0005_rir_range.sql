-- 0005: RIR becomes an optional range rather than one required value.
-- Additive only. The old rir column stays and keeps its NOT NULL, so the
-- currently deployed build keeps working after this runs, which means it is
-- safe to apply well in advance. It must still be applied BEFORE the build
-- that reads and writes the new columns goes live. Dropping rir happens
-- separately in 0006.

ALTER TABLE workout_sets ADD COLUMN rir_low  INTEGER;
ALTER TABLE workout_sets ADD COLUMN rir_high INTEGER;

UPDATE workout_sets SET rir_low = rir, rir_high = rir;

ALTER TABLE workout_sets
    ADD CONSTRAINT workout_sets_rir_low_range
        CHECK (rir_low IS NULL OR (rir_low >= 0 AND rir_low <= 5)),
    ADD CONSTRAINT workout_sets_rir_high_range
        CHECK (rir_high IS NULL OR (rir_high >= 0 AND rir_high <= 5)),
    ADD CONSTRAINT workout_sets_rir_ordered
        CHECK (rir_low IS NULL OR rir_high IS NULL OR rir_low <= rir_high),
    -- Both set or both null: a half filled range is never valid.
    ADD CONSTRAINT workout_sets_rir_paired
        CHECK ((rir_low IS NULL) = (rir_high IS NULL));
