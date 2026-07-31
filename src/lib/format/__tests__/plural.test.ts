import { describe, it, expect } from "vitest";
import { pluralize } from "@/lib/format/plural";

describe("pluralize", () => {
  it("keeps the noun singular for exactly one", () => {
    expect(pluralize(1, "set")).toBe("1 set");
  });

  it("pluralizes every other count", () => {
    expect(pluralize(0, "set")).toBe("0 sets");
    expect(pluralize(2, "set")).toBe("2 sets");
    expect(pluralize(12, "set")).toBe("12 sets");
  });

  it("takes an explicit plural for an irregular noun", () => {
    expect(pluralize(1, "entry", "entries")).toBe("1 entry");
    expect(pluralize(3, "entry", "entries")).toBe("3 entries");
  });
});
