import { describe, it, expect } from "vitest";
import {
  MODES,
  DEFAULT_MODE,
  resolveMode,
  resolveAppearance,
} from "@/lib/appearance";

describe("resolveMode", () => {
  it("passes through valid modes", () => {
    for (const m of MODES) expect(resolveMode(m)).toBe(m);
  });
  it("defaults invalid or missing to system", () => {
    expect(resolveMode(null)).toBe(DEFAULT_MODE);
    expect(resolveMode(undefined)).toBe("system");
    expect(resolveMode("bogus")).toBe("system");
  });
});

describe("resolveAppearance", () => {
  it("system follows prefersDark", () => {
    expect(resolveAppearance("system", true)).toBe("dark");
    expect(resolveAppearance("system", false)).toBe("light");
  });
  it("explicit modes ignore prefersDark", () => {
    expect(resolveAppearance("light", true)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
  });
});
