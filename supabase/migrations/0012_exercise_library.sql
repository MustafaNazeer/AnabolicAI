-- Exercise library enrichment.
--
-- Grows the default library from 30 to 150 and adds the equipment column the
-- picker filters on and the routine builder will later filter on. The column
-- is nullable because an exercise a user adds through the picker has no
-- equipment, exactly as it already has no muscle group.
--
-- This file is the ONE authoritative copy of the default library. seed.sql no
-- longer inserts exercises. Every insert below is guarded, so this migration
-- is idempotent: running it twice inserts nothing the second time, and running
-- it on a database that already holds some defaults fills only the gaps.
--
-- The order of the two data statements is load bearing and each half covers a
-- different kind of database. On an existing database the update is what gives
-- the original 30 rows their equipment, because the insert skips them by name.
-- On a fresh database the update matches nothing and the insert supplies
-- equipment directly. Both halves must be correct on both kinds of database.

alter table exercises add column if not exists equipment text;

alter table exercises drop constraint if exists exercises_equipment_valid;
alter table exercises add constraint exercises_equipment_valid check (
  equipment is null or equipment in
    ('Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Other')
);

-- No name below contains an apostrophe, so the VALUES list needs no escaping.
-- Any future addition that does must double it, for example 'Captain''s Chair'.
create temporary table library_seed (
  name text,
  muscle_group text,
  equipment text
) on commit drop;

insert into library_seed (name, muscle_group, equipment) values
  ('Bench Press', 'Chest', 'Barbell'),
  ('Incline Bench Press', 'Chest', 'Barbell'),
  ('Decline Bench Press', 'Chest', 'Barbell'),
  ('Close Grip Bench Press', 'Chest', 'Barbell'),
  ('Dumbbell Bench Press', 'Chest', 'Dumbbell'),
  ('Incline Dumbbell Bench Press', 'Chest', 'Dumbbell'),
  ('Decline Dumbbell Bench Press', 'Chest', 'Dumbbell'),
  ('Dumbbell Fly', 'Chest', 'Dumbbell'),
  ('Incline Dumbbell Fly', 'Chest', 'Dumbbell'),
  ('Dumbbell Pullover', 'Chest', 'Dumbbell'),
  ('Machine Chest Press', 'Chest', 'Machine'),
  ('Incline Machine Chest Press', 'Chest', 'Machine'),
  ('Smith Machine Bench Press', 'Chest', 'Machine'),
  ('Pec Deck', 'Chest', 'Machine'),
  ('Cable Crossover', 'Chest', 'Cable'),
  ('Low Cable Fly', 'Chest', 'Cable'),
  ('High Cable Fly', 'Chest', 'Cable'),
  ('Push-Up', 'Chest', 'Bodyweight'),
  ('Incline Push-Up', 'Chest', 'Bodyweight'),
  ('Decline Push-Up', 'Chest', 'Bodyweight'),
  ('Dip', 'Chest', 'Bodyweight'),
  ('Weighted Dip', 'Chest', 'Other'),
  ('Deadlift', 'Back', 'Barbell'),
  ('Sumo Deadlift', 'Back', 'Barbell'),
  ('Rack Pull', 'Back', 'Barbell'),
  ('Barbell Row', 'Back', 'Barbell'),
  ('Pendlay Row', 'Back', 'Barbell'),
  ('T-Bar Row', 'Back', 'Barbell'),
  ('Meadows Row', 'Back', 'Barbell'),
  ('Seal Row', 'Back', 'Barbell'),
  ('Barbell Shrug', 'Back', 'Barbell'),
  ('Trap Bar Deadlift', 'Back', 'Other'),
  ('Dumbbell Row', 'Back', 'Dumbbell'),
  ('Chest Supported Dumbbell Row', 'Back', 'Dumbbell'),
  ('Dumbbell Shrug', 'Back', 'Dumbbell'),
  ('Machine Row', 'Back', 'Machine'),
  ('Chest Supported Machine Row', 'Back', 'Machine'),
  ('Machine Pullover', 'Back', 'Machine'),
  ('Lat Pulldown', 'Back', 'Cable'),
  ('Wide Grip Lat Pulldown', 'Back', 'Cable'),
  ('Close Grip Lat Pulldown', 'Back', 'Cable'),
  ('Seated Cable Row', 'Back', 'Cable'),
  ('Single Arm Cable Row', 'Back', 'Cable'),
  ('Straight Arm Pulldown', 'Back', 'Cable'),
  ('Cable Shrug', 'Back', 'Cable'),
  ('Pull-Up', 'Back', 'Bodyweight'),
  ('Chin-Up', 'Back', 'Bodyweight'),
  ('Inverted Row', 'Back', 'Bodyweight'),
  ('Back Extension', 'Back', 'Bodyweight'),
  ('Weighted Pull-Up', 'Back', 'Other'),
  ('Overhead Press', 'Shoulders', 'Barbell'),
  ('Seated Barbell Overhead Press', 'Shoulders', 'Barbell'),
  ('Push Press', 'Shoulders', 'Barbell'),
  ('Upright Row', 'Shoulders', 'Barbell'),
  ('Landmine Press', 'Shoulders', 'Barbell'),
  ('Seated Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'),
  ('Standing Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'),
  ('Arnold Press', 'Shoulders', 'Dumbbell'),
  ('Lateral Raise', 'Shoulders', 'Dumbbell'),
  ('Front Raise', 'Shoulders', 'Dumbbell'),
  ('Rear Delt Fly', 'Shoulders', 'Dumbbell'),
  ('Machine Shoulder Press', 'Shoulders', 'Machine'),
  ('Smith Machine Shoulder Press', 'Shoulders', 'Machine'),
  ('Machine Lateral Raise', 'Shoulders', 'Machine'),
  ('Reverse Pec Deck', 'Shoulders', 'Machine'),
  ('Face Pull', 'Shoulders', 'Cable'),
  ('Cable Lateral Raise', 'Shoulders', 'Cable'),
  ('Cable Front Raise', 'Shoulders', 'Cable'),
  ('Cable Rear Delt Fly', 'Shoulders', 'Cable'),
  ('Cable Upright Row', 'Shoulders', 'Cable'),
  ('Pike Push-Up', 'Shoulders', 'Bodyweight'),
  ('Handstand Push-Up', 'Shoulders', 'Bodyweight'),
  ('Squat', 'Legs', 'Barbell'),
  ('Front Squat', 'Legs', 'Barbell'),
  ('Box Squat', 'Legs', 'Barbell'),
  ('Pause Squat', 'Legs', 'Barbell'),
  ('Zercher Squat', 'Legs', 'Barbell'),
  ('Barbell Lunge', 'Legs', 'Barbell'),
  ('Romanian Deadlift', 'Legs', 'Barbell'),
  ('Stiff Leg Deadlift', 'Legs', 'Barbell'),
  ('Hip Thrust', 'Legs', 'Barbell'),
  ('Good Morning', 'Legs', 'Barbell'),
  ('Goblet Squat', 'Legs', 'Dumbbell'),
  ('Bulgarian Split Squat', 'Legs', 'Dumbbell'),
  ('Walking Lunge', 'Legs', 'Dumbbell'),
  ('Reverse Lunge', 'Legs', 'Dumbbell'),
  ('Step-Up', 'Legs', 'Dumbbell'),
  ('Dumbbell Romanian Deadlift', 'Legs', 'Dumbbell'),
  ('Leg Press', 'Legs', 'Machine'),
  ('Hack Squat', 'Legs', 'Machine'),
  ('Smith Machine Squat', 'Legs', 'Machine'),
  ('Belt Squat', 'Legs', 'Machine'),
  ('Leg Curl', 'Legs', 'Machine'),
  ('Seated Leg Curl', 'Legs', 'Machine'),
  ('Lying Leg Curl', 'Legs', 'Machine'),
  ('Leg Extension', 'Legs', 'Machine'),
  ('Calf Raise', 'Legs', 'Machine'),
  ('Standing Calf Raise', 'Legs', 'Machine'),
  ('Seated Calf Raise', 'Legs', 'Machine'),
  ('Adductor Machine', 'Legs', 'Machine'),
  ('Abductor Machine', 'Legs', 'Machine'),
  ('Cable Pull Through', 'Legs', 'Cable'),
  ('Cable Kickback', 'Legs', 'Cable'),
  ('Glute Bridge', 'Legs', 'Bodyweight'),
  ('Nordic Curl', 'Legs', 'Bodyweight'),
  ('Sissy Squat', 'Legs', 'Bodyweight'),
  ('Pistol Squat', 'Legs', 'Bodyweight'),
  ('Barbell Curl', 'Arms', 'Barbell'),
  ('EZ Bar Curl', 'Arms', 'Barbell'),
  ('Preacher Curl', 'Arms', 'Barbell'),
  ('Reverse Curl', 'Arms', 'Barbell'),
  ('Skull Crusher', 'Arms', 'Barbell'),
  ('JM Press', 'Arms', 'Barbell'),
  ('Dumbbell Curl', 'Arms', 'Dumbbell'),
  ('Incline Dumbbell Curl', 'Arms', 'Dumbbell'),
  ('Hammer Curl', 'Arms', 'Dumbbell'),
  ('Concentration Curl', 'Arms', 'Dumbbell'),
  ('Spider Curl', 'Arms', 'Dumbbell'),
  ('Zottman Curl', 'Arms', 'Dumbbell'),
  ('Dumbbell Skull Crusher', 'Arms', 'Dumbbell'),
  ('Overhead Tricep Extension', 'Arms', 'Dumbbell'),
  ('Dumbbell Kickback', 'Arms', 'Dumbbell'),
  ('Wrist Curl', 'Arms', 'Dumbbell'),
  ('Reverse Wrist Curl', 'Arms', 'Dumbbell'),
  ('Machine Preacher Curl', 'Arms', 'Machine'),
  ('Machine Tricep Extension', 'Arms', 'Machine'),
  ('Cable Curl', 'Arms', 'Cable'),
  ('Cable Hammer Curl', 'Arms', 'Cable'),
  ('Cable Reverse Curl', 'Arms', 'Cable'),
  ('Tricep Pushdown', 'Arms', 'Cable'),
  ('Rope Tricep Pushdown', 'Arms', 'Cable'),
  ('Single Arm Tricep Pushdown', 'Arms', 'Cable'),
  ('Cable Overhead Tricep Extension', 'Arms', 'Cable'),
  ('Close Grip Push-Up', 'Arms', 'Bodyweight'),
  ('Bench Dip', 'Arms', 'Bodyweight'),
  ('Plank', 'Core', 'Bodyweight'),
  ('Side Plank', 'Core', 'Bodyweight'),
  ('Crunch', 'Core', 'Bodyweight'),
  ('Sit-Up', 'Core', 'Bodyweight'),
  ('Decline Sit-Up', 'Core', 'Bodyweight'),
  ('Bicycle Crunch', 'Core', 'Bodyweight'),
  ('Hanging Leg Raise', 'Core', 'Bodyweight'),
  ('Vertical Leg Raise', 'Core', 'Bodyweight'),
  ('Mountain Climber', 'Core', 'Bodyweight'),
  ('Dead Bug', 'Core', 'Bodyweight'),
  ('Machine Crunch', 'Core', 'Machine'),
  ('Cable Crunch', 'Core', 'Cable'),
  ('Pallof Press', 'Core', 'Cable'),
  ('Russian Twist', 'Core', 'Other'),
  ('Ab Wheel Rollout', 'Core', 'Other');

-- Gives the defaults that already exist their equipment and, harmlessly,
-- reasserts their muscle group. Matches nothing on a fresh database.
update exercises e
   set equipment = s.equipment,
       muscle_group = s.muscle_group
  from library_seed s
 where e.name = s.name
   and e.is_default;

-- Inserts only what is missing. A user's custom exercise of the same name does
-- NOT block a default, because defaults are global and customs are per user, so
-- guarding on name alone would let one user suppress a default for everybody.
insert into exercises (name, muscle_group, equipment, is_default, user_id)
select s.name, s.muscle_group, s.equipment, true, null
  from library_seed s
 where not exists (
   select 1 from exercises e where e.name = s.name and e.is_default
 );
