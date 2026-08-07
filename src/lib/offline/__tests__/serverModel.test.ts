import { describe, it, expect } from "vitest";
import {
  createServerModel,
  applyLogSet,
  applyDeleteSet,
  applyUpdateSet,
  applySwapExercise,
  applyUndoSwap,
  applyFinishSession,
  swapKey,
} from "@/lib/offline/__tests__/serverModel";

const row = {
  id: "x1",
  sessionId: "sess1",
  exerciseId: "e1",
  setNumber: 1,
  reps: 8,
  weight: 135,
  rirLow: null,
  rirHigh: null,
};

describe("the reference server model", () => {
  it("ignores a duplicate insert rather than overwriting or failing", () => {
    const m = createServerModel();
    expect(applyLogSet(m, row)).toEqual({ ok: true });
    expect(applyLogSet(m, { ...row, reps: 99 })).toEqual({ ok: true });
    expect(m.sets.get("x1")?.reps).toBe(8);
    expect(m.sets.size).toBe(1);
  });

  it("treats deleting an absent row as success", () => {
    const m = createServerModel();
    expect(applyDeleteSet(m, { id: "nope" })).toEqual({ ok: true });
    expect(m.sets.size).toBe(0);
  });

  it("treats an update matching zero rows as success", () => {
    const m = createServerModel();
    const res = applyUpdateSet(m, {
      id: "nope",
      reps: 5,
      weight: 100,
      rirLow: null,
      rirHigh: null,
    });
    expect(res).toEqual({ ok: true });
    expect(m.sets.size).toBe(0);
  });

  it("replaces a swap for a slot rather than adding a second", () => {
    const m = createServerModel();
    applySwapExercise(m, {
      sessionId: "sess1",
      originalExerciseId: "o",
      replacementExerciseId: "r1",
    });
    applySwapExercise(m, {
      sessionId: "sess1",
      originalExerciseId: "o",
      replacementExerciseId: "r2",
    });
    expect(m.swaps.size).toBe(1);
    expect(m.swaps.get(swapKey("sess1", "o"))).toBe("r2");
  });

  it("rejects a re-delivered swap as non retryable, matching actions.ts line 197", () => {
    const m = createServerModel();
    const p = {
      sessionId: "sess1",
      originalExerciseId: "o",
      replacementExerciseId: "r1",
    };
    expect(applySwapExercise(m, p)).toEqual({ ok: true });
    expect(applySwapExercise(m, p)).toEqual({ ok: false, retryable: false });
    expect(m.swaps.get(swapKey("sess1", "o"))).toBe("r1");
  });

  it("undoes a swap and treats an absent one as success", () => {
    const m = createServerModel();
    applySwapExercise(m, {
      sessionId: "sess1",
      originalExerciseId: "o",
      replacementExerciseId: "r1",
    });
    expect(
      applyUndoSwap(m, { sessionId: "sess1", originalExerciseId: "o" }),
    ).toEqual({ ok: true });
    expect(m.swaps.size).toBe(0);
    expect(
      applyUndoSwap(m, { sessionId: "sess1", originalExerciseId: "o" }),
    ).toEqual({ ok: true });
  });

  it("finishes a session idempotently", () => {
    const m = createServerModel();
    expect(applyFinishSession(m, { sessionId: "sess1" })).toEqual({ ok: true });
    expect(applyFinishSession(m, { sessionId: "sess1" })).toEqual({ ok: true });
    expect(m.finished.has("sess1")).toBe(true);
  });

  it("refuses a swap to the same exercise, matching actions.ts line 158", () => {
    const m = createServerModel();
    const res = applySwapExercise(m, {
      sessionId: "sess1",
      originalExerciseId: "o",
      replacementExerciseId: "o",
    });
    expect(res).toEqual({ ok: false, retryable: false });
    expect(m.swaps.size).toBe(0);
  });
});
