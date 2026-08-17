import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raw = readFileSync(
  join(__dirname, "../../../../supabase/migrations/0023_planner_hidden_categories.sql"),
  "utf8",
).toLowerCase();

// Assertions are about executable SQL, not prose, so a comment explaining a
// rule cannot satisfy a search for the rule itself.
const statements = raw
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("0023_planner_hidden_categories", () => {
  it("creates the table", () => {
    expect(statements).toContain(
      "create table if not exists planner_hidden_categories",
    );
  });

  // WHY A TABLE RATHER THAN A DELETE. The six seeded categories are one global
  // row each, shared by every account, so deleting one would take it from
  // everybody. Hiding is per account by construction.
  it("keys a hide to one account and one category", () => {
    expect(statements).toMatch(/primary\s+key\s*\(\s*user_id\s*,\s*category_id\s*\)/);
  });

  // Hiding the same category twice must not be two rows, which the primary key
  // already guarantees; this states the intent so it is not dropped later.
  it("cascades a hide away when its category or its account goes", () => {
    expect(statements).toContain("references auth.users(id) on delete cascade");
    expect(statements).toContain("references planner_categories(id) on delete cascade");
  });

  it("enables row level security", () => {
    expect(statements).toContain(
      "alter table planner_hidden_categories enable row level security",
    );
  });

  // Every policy must be scoped to the caller. Without it one account could
  // hide a category for another, which is the only real damage this table can
  // do, since the rows themselves carry nothing private.
  it("scopes every policy to the calling account", () => {
    const policies = statements
      .split(";")
      .filter(
        (s) => s.includes("create policy") && s.includes("on planner_hidden_categories"),
      );

    expect(policies, "select, insert and delete each need the check").toHaveLength(3);
    for (const policy of policies) {
      expect(policy).toContain("auth.uid() = user_id");
    }
  });

  // NO UPDATE, AND THE ABSENCE IS DELIBERATE. A hide is created or removed and
  // never edited; there is nothing on the row to change. Granting update would
  // let a row be repointed at another category, which insert already covers
  // under a policy, so it would be surface with no purpose.
  it("never grants update on the table", () => {
    const updateGrants = statements
      .split(";")
      .filter((s) => s.includes("grant") && s.includes("update"));
    for (const stmt of updateGrants) {
      expect(stmt).not.toContain("planner_hidden_categories");
    }
  });

  it("grants what the app actually needs", () => {
    expect(statements).toMatch(
      /grant\s+select\s*,\s*insert\s*,\s*delete\s+on\s+planner_hidden_categories\s+to\s+authenticated/,
    );
  });
});
