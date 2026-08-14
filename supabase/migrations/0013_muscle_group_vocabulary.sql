-- Constrains muscle_group to the six values the app knows.
--
-- This closes an asymmetry rather than adding a new idea: 0012 already
-- constrained equipment the same way, while muscle_group carried only a
-- length cap. createExercise trims whatever string it is handed, so 'chest',
-- 'Chest ' and 'Pecs' would all persist and all vanish from a Chest filter.
-- The routine builder filters on this column, so an unconstrained value is
-- the same silent exclusion this whole project exists to remove.
--
-- NULL STAYS PERMITTED, deliberately. Customs created before this migration
-- carry no muscle group and must survive it; the Settings sweep is what
-- clears them. NOT NULL is impossible while any untagged row exists, and
-- filling those rows automatically would be inventing data.
--
-- RUN THIS FIRST. A CHECK added against a violating row fails, and it fails
-- in production seconds after you paste it:
--
--   select id, name, muscle_group
--     from exercises
--    where muscle_group is not null
--      and muscle_group not in
--          ('Chest','Back','Shoulders','Legs','Arms','Core');
--   -- expect no rows

alter table exercises drop constraint if exists exercises_muscle_group_valid;
alter table exercises add constraint exercises_muscle_group_valid check (
  muscle_group is null or muscle_group in
    ('Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core')
);
