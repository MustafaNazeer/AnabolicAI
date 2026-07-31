import { describe, it, expect } from "vitest";
import { parseRir, formatRir, rirSuffix } from "@/lib/workout/rir";

describe("parseRir", () => {
  it("treats both blank as no RIR", () => {
    expect(parseRir("", "")).toEqual({ rirLow: null, rirHigh: null });
    expect(parseRir("  ", " ")).toEqual({ rirLow: null, rirHigh: null });
  });

  it("stores a single value in both fields", () => {
    expect(parseRir("2", "")).toEqual({ rirLow: 2, rirHigh: 2 });
    expect(parseRir("0", "")).toEqual({ rirLow: 0, rirHigh: 0 });
  });

  it("keeps a range as given", () => {
    expect(parseRir("0", "1")).toEqual({ rirLow: 0, rirHigh: 1 });
  });

  it("collapses a range whose ends match", () => {
    expect(parseRir("3", "3")).toEqual({ rirLow: 3, rirHigh: 3 });
  });

  it("rejects a high without a low", () => {
    expect(parseRir("", "2")).toEqual({ error: "Enter the lower RIR first." });
  });

  it("rejects a reversed range", () => {
    expect(parseRir("3", "1")).toEqual({
      error: "RIR range must go from low to high.",
    });
  });

  it("rejects values outside 0 to 5", () => {
    expect(parseRir("6", "")).toEqual({ error: "RIR must be 0 to 5." });
    expect(parseRir("-1", "")).toEqual({ error: "RIR must be 0 to 5." });
    expect(parseRir("0", "6")).toEqual({ error: "RIR must be 0 to 5." });
  });

  it("rejects anything that is not a whole number", () => {
    expect(parseRir("1.5", "")).toEqual({ error: "RIR must be a whole number." });
    expect(parseRir("two", "")).toEqual({ error: "RIR must be a whole number." });
  });
});

describe("formatRir", () => {
  it("is blank when there is no RIR", () => {
    expect(formatRir(null, null)).toBe("");
  });

  it("shows a single value once", () => {
    expect(formatRir(2, 2)).toBe("2");
  });

  it("shows a range with a hyphen", () => {
    expect(formatRir(0, 1)).toBe("0-1");
  });
});

describe("rirSuffix", () => {
  it("is blank when there is no RIR", () => {
    expect(rirSuffix(null, null)).toBe("");
  });

  it("names a single value once", () => {
    expect(rirSuffix(2, 2)).toBe(", 2 RIR");
  });

  it("names a range with a hyphen", () => {
    expect(rirSuffix(0, 1)).toBe(", 0-1 RIR");
  });
});
