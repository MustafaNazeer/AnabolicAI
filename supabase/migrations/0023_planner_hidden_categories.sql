-- Which planner categories an account has taken out of its own picker.
--
-- WHY THIS IS A TABLE AND NOT A DELETE. The six seeded categories are one
-- global row each, owned by nobody and read by every account through
-- planner_categories_select. Deleting one would take it away from everybody,
-- and the delete policy refuses anyway because it keys on ownership and a
-- seeded row has no owner. Hiding is per account by construction.
--
-- AND WHY NOTHING IS EVER REALLY DELETED. planner_day_categories references a
-- category with ON DELETE RESTRICT, so a category any day already uses could
-- not be removed even if it were hers. A hide sidesteps that completely: the
-- row stays, days that already carry the label still resolve its name, and it
-- simply stops being offered for new days. Removing a chip therefore cannot
-- rewrite a week that has already happened.
create table if not exists planner_hidden_categories (
    user_id     uuid not null references auth.users(id) on delete cascade,
    category_id uuid not null references planner_categories(id) on delete cascade,
    created_at  timestamptz not null default now(),
    -- One row per account per category, so hiding twice is not two rows and
    -- unhiding is a single delete rather than a loop.
    primary key (user_id, category_id)
);

alter table planner_hidden_categories enable row level security;

-- Scoped to the caller on every verb. These rows carry nothing private, so the
-- only real damage this table can do is one account hiding a category for
-- another, and that is what these prevent.
create policy planner_hidden_categories_select on planner_hidden_categories for select using (
    auth.uid() = user_id
);
create policy planner_hidden_categories_insert on planner_hidden_categories for insert with check (
    auth.uid() = user_id
);
create policy planner_hidden_categories_delete on planner_hidden_categories for delete using (
    auth.uid() = user_id
);

-- NO UPDATE, AND THE ABSENCE IS DELIBERATE. A hide is created or removed, never
-- edited; there is nothing on the row to change. Granting it would only add a
-- way to repoint a row at another category, which insert already covers.
grant select, insert, delete on planner_hidden_categories to authenticated;

-- Verification, expecting 0 on a fresh install and never an error:
--
--   select count(*) from planner_hidden_categories;
--
-- And expecting FALSE, which is the grant this file deliberately withholds:
--
--   select has_table_privilege('authenticated', 'public.planner_hidden_categories',
--                              'update') as can_update;
