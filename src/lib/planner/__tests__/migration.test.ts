import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The gate's security property lives in a migration rather than in code, so it
// is asserted here rather than left to a comment. 0017_ai_visible.sql added a
// column with no grant and broke every settings write until 0018 supplied one;
// this column must go the other way and STAY ungranted for UPDATE, because a
// writable gate is one any signed in account can let itself through.
const raw = readFileSync(
  join(__dirname, "../../../../supabase/migrations/0020_week_planner.sql"),
  "utf8",
).toLowerCase();

// Grant assertions are about executable SQL, not prose. Without stripping
// comments, the paragraph explaining WHY there is no update grant would itself
// satisfy a search for one, and the test would pass on the strength of its own
// documentation. The verification query is checked against `raw` instead,
// because 0018 keeps that query in a comment and this file copies the form.
const statements = raw
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("0020_week_planner", () => {
  it("adds the column defaulting to off, so nobody's app changes on deploy", () => {
    expect(statements).toContain(
      "add column if not exists week_planner boolean not null default false",
    );
  });

  // THE ASSERTION THIS FILE EXISTS FOR. Granting update would make the gate
  // decorative: any authenticated account could switch itself into the planner
  // with a single PostgREST request, because the RLS policy on user_settings
  // already lets a row's owner update their own row.
  it("never grants update on the column to authenticated", () => {
    const updateGrants = statements
      .split(";")
      .filter((s) => s.includes("grant") && s.includes("update"));
    for (const stmt of updateGrants) {
      expect(stmt, "week_planner must stay unwritable by its own owner").not.toContain(
        "week_planner",
      );
    }
  });

  // Reading is the opposite case and must be explicit rather than assumed.
  // 0018 showed that a column added to this table is not automatically covered
  // by whatever grants the table already carries, and the app has to read its
  // own flag to know which interface to render.
  it("grants select on the column, so the account can read its own flag", () => {
    expect(statements).toMatch(
      /grant\s+select\s*\(\s*week_planner\s*\)\s+on\s+user_settings/,
    );
  });

  // 0018's rule, carried forward: check has_column_privilege after adding any
  // column, and state the expected answer rather than leaving it to be guessed.
  it("carries a verification query naming both privileges", () => {
    expect(raw).toContain("has_column_privilege");
    expect(raw).toContain("'update'");
    expect(raw).toContain("'select'");
  });
});
