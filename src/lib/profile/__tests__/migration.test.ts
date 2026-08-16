import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raw = readFileSync(
  join(__dirname, "../../../../supabase/migrations/0022_display_name.sql"),
  "utf8",
).toLowerCase();

// Grant assertions are about executable SQL, not prose. Without stripping
// comments, the paragraph explaining a grant would itself satisfy a search for
// one, and the test would pass on the strength of its own documentation.
const statements = raw
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("0022_display_name", () => {
  // Nullable on purpose, and the default is the absence of a value rather than
  // an empty string, because null is what makes the prompt a one time question.
  it("adds a nullable column with no default", () => {
    expect(statements).toMatch(
      /add column if not exists display_name\s+text(?!\s+not null)/,
    );
    expect(statements).not.toMatch(/display_name[^;]*default/);
  });

  // THE OPPOSITE PAIRING TO week_planner, and the contrast is the point. That
  // column is a gate an admin sets, so it is granted select and deliberately
  // never update. This one is the person's own name for their own greeting, so
  // it must be writable by its owner, exactly like ai_visible in 0018.
  it("grants both select and update on the column", () => {
    expect(statements).toMatch(
      /grant\s+select\s*\(\s*display_name\s*\)\s+on\s+user_settings/,
    );
    expect(statements).toMatch(
      /grant\s+update\s*\(\s*display_name\s*\)\s+on\s+user_settings/,
    );
  });

  // 0017 added a column with no grant and broke every settings write until 0018
  // supplied one. The rule that came out of it is to check has_column_privilege
  // after adding any column, and to state the expected answer rather than leave
  // it to be guessed.
  it("carries a verification query naming both privileges", () => {
    expect(raw).toContain("has_column_privilege");
    expect(raw).toContain("'update'");
    expect(raw).toContain("'select'");
  });

  it("caps the length so the interface's own message is the one seen", () => {
    expect(statements).toMatch(/char_length\s*\(\s*display_name\s*\)\s*<=\s*40/);
  });
});
