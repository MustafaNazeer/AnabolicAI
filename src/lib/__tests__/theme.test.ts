import { describe, it, expect } from "vitest";
import { THEMES, DEFAULT_THEME, resolveTheme } from "@/lib/theme";

describe("theme", () => {
  it("ships exactly the five v1 accents with crimson default", () => {
    expect(THEMES).toEqual(["cobalt", "magenta", "emerald", "crimson", "rose"]);
    expect(DEFAULT_THEME).toBe("crimson");
  });

  it("passes through valid themes", () => {
    expect(resolveTheme("emerald")).toBe("emerald");
  });

  it("falls back to the default for invalid or missing values", () => {
    expect(resolveTheme("teal")).toBe("crimson");
    expect(resolveTheme(null)).toBe("crimson");
    expect(resolveTheme(undefined)).toBe("crimson");
  });
});
