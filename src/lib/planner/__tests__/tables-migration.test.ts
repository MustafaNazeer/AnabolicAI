import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raw = readFileSync(
  join(__dirname, "../../../../supabase/migrations/0021_week_planner_tables.sql"),
  "utf8",
).toLowerCase();

// Assertions are about executable SQL, not prose, so a comment explaining a
// rule cannot satisfy a search for the rule itself.
const statements = raw
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("0021_week_planner_tables", () => {
  it("creates all three tables", () => {
    expect(statements).toContain("create table if not exists planner_categories");
    expect(statements).toContain("create table if not exists planner_days");
    expect(statements).toContain("create table if not exists planner_day_categories");
  });

  // Copied from exercises_default_no_user. A seeded row belongs to nobody and a
  // custom row must belong to someone, or the select policy leaks one user's
  // categories to another.
  it("refuses a seeded category with an owner and a custom one without", () => {
    expect(statements).toContain("is_default = true and user_id is null");
    expect(statements).toContain("is_default = false and user_id is not null");
  });

  // One row per day is what "a plan is replaced rather than kept" means, and it
  // is also what makes a redelivered write an upsert rather than a second day.
  it("allows only one row per user per day", () => {
    expect(statements).toMatch(/unique\s*\(\s*user_id\s*,\s*day\s*\)/);
  });

  it("enables row level security on all three tables", () => {
    expect(statements).toContain("alter table planner_categories enable row level security");
    expect(statements).toContain("alter table planner_days enable row level security");
    expect(statements).toContain(
      "alter table planner_day_categories enable row level security",
    );
  });

  // The join table has no user_id of its own, so EVERY policy on it has to
  // reach through to the day. Without that a signed in account could attach
  // labels to somebody else's day, which RLS on planner_days alone does not
  // prevent.
  //
  // ASSERTED PER POLICY RATHER THAN OVER THE WHOLE FILE, and that is the whole
  // point of this test. The obvious form, searching the migration for
  // "from planner_days" and "auth.uid()", passes while the select policy is
  // deleted outright, because the other two policies still contain both
  // strings, and it passes while any one policy is written "using (true)". It
  // was measured doing exactly that before this form replaced it.
  it("scopes every join table policy through its parent day's owner", () => {
    const policies = statements
      .split(";")
      .filter((s) => s.includes("create policy") && s.includes("on planner_day_categories"));

    expect(policies, "select, insert and delete must each carry the check").toHaveLength(3);
    for (const policy of policies) {
      expect(policy).toContain("from planner_days");
      expect(policy).toContain("auth.uid()");
    }
  });

  it("seeds the default categories with no owner", () => {
    expect(statements).toContain("insert into planner_categories");
    expect(statements).toContain("rest");
  });

  // A category name carries no unique constraint, so "on conflict do nothing"
  // can never fire here and a second run of this file would seed a second set
  // of six defaults, which every account would then see twice. 0012 guards the
  // default exercise seed with "where not exists" for the same reason, and this
  // table copies that table on purpose.
  it("guards the seed so a re-run cannot duplicate the defaults", () => {
    const seed = statements
      .split(";")
      .find((s) => s.includes("insert into planner_categories"));

    expect(seed).toBeDefined();
    expect(seed).toContain("where not exists");
    expect(seed, "nothing can conflict without a unique constraint").not.toContain(
      "on conflict",
    );
  });
});
