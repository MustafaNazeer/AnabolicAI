-- The week planner's own tables. Nothing here touches workout_sessions or
-- workout_sets, and that is the point: this app is routine first from the
-- schema up, and one account needs a spine where the unit is the day and its
-- category. The two live side by side rather than one bending to the other.
--
-- Visibility is decided entirely by user_settings.week_planner (0020). These
-- tables are readable only by their owner regardless, so an account without the
-- flag simply has no rows and no interface pointing at them.

-- Categories: a seeded set everyone gets, plus whatever she adds herself.
-- This copies the exercises table exactly, including its check constraint and
-- its select policy, because it is the same problem and must not grow a second
-- pattern.
create table if not exists planner_categories (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade,
    name        text not null,
    is_default  boolean not null default false,
    created_at  timestamptz not null default now(),
    constraint planner_categories_default_no_user check (
        (is_default = true and user_id is null) or
        (is_default = false and user_id is not null)
    ),
    constraint planner_categories_name_length check (char_length(name) <= 60)
);

-- One row per day. "done" is what separates a day she planned from a day she
-- actually had: false when written ahead, true once logged. Without it a plan
-- she skipped would read as a workout she performed, in both the calendar and
-- the balance, which is the opposite of what she asked for first.
create table if not exists planner_days (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    day         date not null,
    done        boolean not null default false,
    note        text,
    link_url    text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint planner_days_note_length check (note is null or char_length(note) <= 500),
    constraint planner_days_link_length check (link_url is null or char_length(link_url) <= 500),
    unique (user_id, day)
);

-- A day carries every label she picked rather than one main one, so a Tuesday
-- can be lower body and abs at once and the balance counts both.
create table if not exists planner_day_categories (
    day_id       uuid not null references planner_days(id) on delete cascade,
    category_id  uuid not null references planner_categories(id) on delete restrict,
    primary key (day_id, category_id)
);

create index if not exists planner_days_user_day_idx on planner_days (user_id, day);

alter table planner_categories enable row level security;
alter table planner_days enable row level security;
alter table planner_day_categories enable row level security;

-- Your own categories plus the seeded ones, exactly as exercises_select does.
create policy planner_categories_select on planner_categories for select using (
    auth.uid() is not null and (auth.uid() = user_id or (is_default = true and user_id is null))
);
create policy planner_categories_insert on planner_categories for insert with check (
    auth.uid() = user_id and is_default = false
);
create policy planner_categories_update on planner_categories for update using (
    auth.uid() = user_id
) with check (auth.uid() = user_id);
create policy planner_categories_delete on planner_categories for delete using (
    auth.uid() = user_id
);

create policy planner_days_select on planner_days for select using (auth.uid() = user_id);
create policy planner_days_insert on planner_days for insert with check (auth.uid() = user_id);
create policy planner_days_update on planner_days for update using (
    auth.uid() = user_id
) with check (auth.uid() = user_id);
create policy planner_days_delete on planner_days for delete using (auth.uid() = user_id);

-- THE JOIN TABLE HAS NO OWNER COLUMN, so its policies reach through to the day.
-- Skipping this would let any signed in account attach labels to a day that is
-- not theirs, which RLS on planner_days alone does not prevent.
create policy planner_day_categories_select on planner_day_categories for select using (
    exists (select 1 from planner_days d where d.id = day_id and d.user_id = auth.uid())
);
create policy planner_day_categories_insert on planner_day_categories for insert with check (
    exists (select 1 from planner_days d where d.id = day_id and d.user_id = auth.uid())
);
create policy planner_day_categories_delete on planner_day_categories for delete using (
    exists (select 1 from planner_days d where d.id = day_id and d.user_id = auth.uid())
);

-- Explicit rather than assumed, which is 0018's lesson. These are new tables so
-- nothing has been revoked on them, but stating the grants costs nothing and
-- removes the question. RLS is what restricts rows; these only open the door.
grant select, insert, update, delete on planner_categories to authenticated;
grant select, insert, update, delete on planner_days to authenticated;
grant select, insert, delete on planner_day_categories to authenticated;

-- The seeded set, owned by nobody so every account sees the same six.
--
-- THESE SIX ARE THE ONE THING IN THIS MIGRATION TAKEN FROM A JUDGEMENT RATHER
-- THAN AN ANSWER. Her description names two different sets: "strength/lifting,
-- cardio, abs, arms" when describing what she records, and "lower body, upper
-- body, rest, cardio, arms" when drawing her actual week. The second is used
-- here because it is the one she reached for when writing out a real week. If
-- she says otherwise it is this list and nothing else that changes.
--
-- GUARDED BY "where not exists" RATHER THAN "on conflict do nothing", and the
-- difference is not cosmetic. There is no unique constraint on a category name,
-- so nothing here can ever raise a conflict, and the on conflict form would
-- silently seed a second set of six on a re-run. 0012_exercise_library.sql
-- guards the default exercise seed exactly this way, and this table copies that
-- table on purpose.
insert into planner_categories (user_id, name, is_default)
select null, seed.name, true
  from (values
    ('Lower Body'),
    ('Upper Body'),
    ('Abs'),
    ('Arms'),
    ('Cardio'),
    ('Rest')
  ) as seed(name)
 where not exists (
   select 1 from planner_categories c where c.name = seed.name and c.is_default
 );

-- Verification, expecting 6 rows all owned by nobody:
--
--   select count(*) filter (where is_default and user_id is null) as seeded,
--          count(*) as total
--     from planner_categories;
