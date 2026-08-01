import { describe, it, expect } from "vitest";
import { sameSessionState, type SessionState } from "@/lib/offline/sessionState";
import type { LocalSet } from "@/lib/offline/store";

function set(over: Partial<LocalSet> = {}): LocalSet {
  return {
    id: "s1",
    sessionId: "sess1",
    exerciseId: "bench",
    setNumber: 1,
    reps: 8,
    weight: 135,
    rirLow: null,
    rirHigh: null,
    syncState: "synced",
    ...over,
  };
}

const base: SessionState = {
  sets: [set({ id: "s1", setNumber: 1 }), set({ id: "s2", setNumber: 2 })],
  swaps: [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
};

describe("sameSessionState", () => {
  it("is true for two empty states", () => {
    expect(sameSessionState({ sets: [], swaps: [] }, { sets: [], swaps: [] })).toBe(true);
  });

  it("is true for identical states", () => {
    expect(sameSessionState(base, structuredClone(base))).toBe(true);
  });

  // Every source sorts by setNumber alone, which is not a total order across
  // exercises, so the same data can arrive in a different array order. That must
  // not read as a change or the screen animates on mount for nothing.
  it("ignores array order", () => {
    const reordered: SessionState = {
      sets: [base.sets[1], base.sets[0]],
      swaps: base.swaps,
    };
    expect(sameSessionState(base, reordered)).toBe(true);
  });

  it("is false when a set is added", () => {
    const next: SessionState = {
      sets: [...base.sets, set({ id: "s3", setNumber: 3 })],
      swaps: base.swaps,
    };
    expect(sameSessionState(base, next)).toBe(false);
  });

  it("is false when a set is removed", () => {
    expect(sameSessionState(base, { sets: [base.sets[0]], swaps: base.swaps })).toBe(false);
  });

  it("is false when a set stops being pending", () => {
    const next: SessionState = {
      sets: [set({ id: "s1", setNumber: 1, syncState: "pending" }), base.sets[1]],
      swaps: base.swaps,
    };
    expect(sameSessionState(base, next)).toBe(false);
  });

  it("is false when a set is renumbered", () => {
    const next: SessionState = {
      sets: [set({ id: "s1", setNumber: 9 }), base.sets[1]],
      swaps: base.swaps,
    };
    expect(sameSessionState(base, next)).toBe(false);
  });

  // An undo on a slot with no logged sets leaves the set list identical, so a
  // guard that ignored swaps would suppress the swap animation entirely.
  it("is false when a swap is removed", () => {
    expect(sameSessionState(base, { sets: base.sets, swaps: [] })).toBe(false);
  });

  it("is false when a swap's replacement changes", () => {
    const next: SessionState = {
      sets: base.sets,
      swaps: [{ originalExerciseId: "pecdeck", replacementExerciseId: "fly" }],
    };
    expect(sameSessionState(base, next)).toBe(false);
  });
});
