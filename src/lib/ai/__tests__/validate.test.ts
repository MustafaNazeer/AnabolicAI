import { describe, it, expect } from "vitest";
import { validateQuickEntryText, validateParsedSets } from "@/lib/ai/validate";
import { MAX_QUICK_ENTRY_CHARS } from "@/lib/ai/schema";

const set = (over: Partial<Record<string, unknown>> = {}) => ({
  reps: 5,
  weight: 185,
  rirLow: null,
  rirHigh: null,
  ...over,
});

describe("validateQuickEntryText", () => {
  it("trims and accepts ordinary text", () => {
    expect(validateQuickEntryText("  185 for 5 ")).toEqual({
      ok: true,
      text: "185 for 5",
    });
  });

  it("rejects empty and whitespace only input", () => {
    expect(validateQuickEntryText("")).toEqual({ ok: false });
    expect(validateQuickEntryText("   ")).toEqual({ ok: false });
  });

  it("rejects input over the cap and accepts input at the cap", () => {
    expect(validateQuickEntryText("a".repeat(MAX_QUICK_ENTRY_CHARS + 1))).toEqual(
      {
        ok: false,
      },
    );
    expect(validateQuickEntryText("a".repeat(MAX_QUICK_ENTRY_CHARS)).ok).toBe(
      true,
    );
  });
});

describe("validateParsedSets", () => {
  it("accepts a well formed response", () => {
    expect(validateParsedSets({ sets: [set(), set({ reps: 4 })] })).toEqual([
      set(),
      set({ reps: 4 }),
    ]);
  });

  it("rejects non objects, missing sets, and empty sets", () => {
    expect(validateParsedSets(null)).toBeNull();
    expect(validateParsedSets("[]")).toBeNull();
    expect(validateParsedSets({})).toBeNull();
    expect(validateParsedSets({ sets: [] })).toBeNull();
  });

  it("rejects more than ten sets", () => {
    expect(
      validateParsedSets({ sets: Array.from({ length: 11 }, () => set()) }),
    ).toBeNull();
  });

  // The exact rules logSet enforces, mirrored. A model response that logSet
  // would reject must die here, before the user ever sees a preview row.
  it("rejects out of bounds numbers the same way logSet would", () => {
    expect(validateParsedSets({ sets: [set({ reps: 0 })] })).toBeNull();
    expect(validateParsedSets({ sets: [set({ reps: Infinity })] })).toBeNull();
    expect(validateParsedSets({ sets: [set({ weight: -1 })] })).toBeNull();
    expect(validateParsedSets({ sets: [set({ rirLow: 2 })] })).toBeNull();
    expect(validateParsedSets({ sets: [set({ rirHigh: 2 })] })).toBeNull();
    expect(
      validateParsedSets({ sets: [set({ rirLow: 3, rirHigh: 2 })] }),
    ).toBeNull();
    expect(
      validateParsedSets({ sets: [set({ rirLow: 0, rirHigh: 6 })] }),
    ).toBeNull();
    expect(
      validateParsedSets({ sets: [set({ rirLow: 1.5, rirHigh: 2 })] }),
    ).toBeNull();
  });

  it("accepts an equal RIR pair and a proper range", () => {
    expect(
      validateParsedSets({ sets: [set({ rirLow: 2, rirHigh: 2 })] }),
    ).not.toBeNull();
    expect(
      validateParsedSets({ sets: [set({ rirLow: 1, rirHigh: 2 })] }),
    ).not.toBeNull();
  });

  it("rejects rows with wrong types or extra shapes", () => {
    expect(
      validateParsedSets({
        sets: [{ reps: "5", weight: 185, rirLow: null, rirHigh: null }],
      }),
    ).toBeNull();
    expect(validateParsedSets({ sets: [42] })).toBeNull();
  });
});
