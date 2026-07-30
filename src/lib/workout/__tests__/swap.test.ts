import { describe, it, expect } from "vitest";
import {
  buildEffectiveCards,
  takenExerciseIds,
  orphanedExerciseIds,
  type SlotExercise,
} from "@/lib/workout/swap";
import type { Exercise } from "@/lib/data/types";

const slots: SlotExercise[] = [
  { exerciseId: "incline", name: "Incline DB Press", defaultSets: 3 },
  { exerciseId: "pecdeck", name: "Pec Deck", defaultSets: 4 },
  { exerciseId: "fly", name: "Cable Fly", defaultSets: 3 },
];

const library: Exercise[] = [
  { id: "bench", name: "Barbell Bench", muscle_group: "chest", is_default: true },
  { id: "machine", name: "Machine Press", muscle_group: "chest", is_default: true },
] as Exercise[];

describe("buildEffectiveCards", () => {
  it("returns the routine unchanged when there are no swaps", () => {
    const cards = buildEffectiveCards(slots, [], library, {});
    expect(cards.map((c) => c.exerciseId)).toEqual(["incline", "pecdeck", "fly"]);
    expect(cards.every((c) => c.role === "plain")).toBe(true);
    expect(cards.every((c) => c.originalName === null)).toBe(true);
  });

  it("replaces in place and names the original when the original has no sets", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
      library,
      {},
    );
    expect(cards.map((c) => c.exerciseId)).toEqual(["incline", "bench", "fly"]);
    const swapped = cards[1];
    expect(swapped.role).toBe("replacement");
    expect(swapped.originalName).toBe("Pec Deck");
    expect(swapped.slotExerciseId).toBe("pecdeck");
    expect(swapped.canUndo).toBe(true);
  });

  it("inherits the slot's target set count", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
      library,
      {},
    );
    expect(cards[1].defaultSets).toBe(4);
  });

  it("keeps the original as a collapsed card when it already has sets", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
      library,
      { pecdeck: 1 },
    );
    expect(cards.map((c) => c.exerciseId)).toEqual([
      "incline",
      "pecdeck",
      "bench",
      "fly",
    ]);
    expect(cards[1].role).toBe("swappedOutOriginal");
    // The original is on screen, so the replacement does not repeat the label.
    expect(cards[2].role).toBe("replacement");
    expect(cards[2].originalName).toBeNull();
  });

  it("blocks undo once the replacement has sets", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
      library,
      { bench: 2 },
    );
    expect(cards[1].canUndo).toBe(false);
  });

  it("keeps the slot when a second swap replaces the replacement", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "machine" }],
      library,
      {},
    );
    expect(cards[1].exerciseId).toBe("machine");
    expect(cards[1].originalName).toBe("Pec Deck");
    expect(cards[1].slotExerciseId).toBe("pecdeck");
  });

  it("falls back to the routine exercise when the replacement is missing from the library", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "ghost" }],
      library,
      {},
    );
    expect(cards.map((c) => c.exerciseId)).toEqual(["incline", "pecdeck", "fly"]);
    expect(cards[1].role).toBe("plain");
  });
});

describe("takenExerciseIds", () => {
  it("covers every exercise currently on screen", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
      library,
      { pecdeck: 1 },
    );
    expect(takenExerciseIds(cards)).toEqual(
      new Set(["incline", "pecdeck", "bench", "fly"]),
    );
  });
});

describe("orphanedExerciseIds", () => {
  it("finds logged exercises that no card shows", () => {
    const cards = buildEffectiveCards(
      slots,
      [{ originalExerciseId: "pecdeck", replacementExerciseId: "machine" }],
      library,
      { bench: 2, machine: 1 },
    );
    // "bench" was an intermediate replacement that has since been swapped away.
    expect(orphanedExerciseIds(cards, { bench: 2, machine: 1 })).toEqual(["bench"]);
  });

  it("returns nothing when every logged exercise is on screen", () => {
    const cards = buildEffectiveCards(slots, [], library, { incline: 3 });
    expect(orphanedExerciseIds(cards, { incline: 3 })).toEqual([]);
  });

  it("ignores exercises with a zero count", () => {
    const cards = buildEffectiveCards(slots, [], library, {});
    expect(orphanedExerciseIds(cards, { bench: 0 })).toEqual([]);
  });
});
