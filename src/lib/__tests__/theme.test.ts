import { describe, it, expect } from "vitest";
import { THEMES, DEFAULT_THEME, resolveTheme } from "@/lib/theme";

describe("theme", () => {
  it("ships exactly the five v1 accents with cobalt default", () => {
    expect(THEMES).toEqual(["cobalt", "magenta", "emerald", "crimson", "rose"]);
    expect(DEFAULT_THEME).toBe("cobalt");
  });

  it("passes through valid themes", () => {
    expect(resolveTheme("emerald")).toBe("emerald");
  });

  it("falls back to the default for invalid or missing values", () => {
    expect(resolveTheme("teal")).toBe("cobalt");
    expect(resolveTheme(null)).toBe("cobalt");
    expect(resolveTheme(undefined)).toBe("cobalt");
  });
});
