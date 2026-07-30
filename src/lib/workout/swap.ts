import type { Exercise } from "@/lib/data/types";

export type Swap = {
  originalExerciseId: string;
  replacementExerciseId: string;
};

// One entry from the routine, in routine order.
export type SlotExercise = {
  exerciseId: string;
  name: string;
  defaultSets: number;
};

// One card to render on the logging screen. A slot yields one card normally,
// or two when the swapped-out original still holds sets from earlier today.
export type EffectiveCard = {
  exerciseId: string;
  name: string;
  defaultSets: number;
  // The routine exercise this card fills. It is the key a swap is stored under,
  // so it stays the same however many times the slot is swapped.
  slotExerciseId: string;
  role: "plain" | "replacement" | "swappedOutOriginal";
  // Set only when the replacement is the sole card for its slot, so the label
  // is never repeated on two cards for the same slot.
  originalName: string | null;
  canUndo: boolean;
};

export function buildEffectiveCards(
  slots: SlotExercise[],
  swaps: Swap[],
  library: Exercise[],
  setCounts: Record<string, number>,
): EffectiveCard[] {
  const count = (id: string) => setCounts[id] ?? 0;
  const cards: EffectiveCard[] = [];

  for (const slot of slots) {
    const swap = swaps.find((s) => s.originalExerciseId === slot.exerciseId);
    const replacement = swap
      ? library.find((e) => e.id === swap.replacementExerciseId)
      : undefined;

    // No swap, or a swap pointing at an exercise we cannot resolve. Falling
    // back to the routine keeps the screen usable rather than dropping a slot.
    if (!swap || !replacement) {
      cards.push({
        exerciseId: slot.exerciseId,
        name: slot.name,
        defaultSets: slot.defaultSets,
        slotExerciseId: slot.exerciseId,
        role: "plain",
        originalName: null,
        canUndo: false,
      });
      continue;
    }

    const canUndo = count(replacement.id) === 0;
    const originalHasSets = count(slot.exerciseId) > 0;

    if (originalHasSets) {
      cards.push({
        exerciseId: slot.exerciseId,
        name: slot.name,
        defaultSets: slot.defaultSets,
        slotExerciseId: slot.exerciseId,
        role: "swappedOutOriginal",
        originalName: null,
        canUndo,
      });
    }

    cards.push({
      exerciseId: replacement.id,
      name: replacement.name,
      defaultSets: slot.defaultSets,
      slotExerciseId: slot.exerciseId,
      role: "replacement",
      originalName: originalHasSets ? null : slot.name,
      canUndo,
    });
  }

  return cards;
}

export function takenExerciseIds(cards: EffectiveCard[]): Set<string> {
  return new Set(cards.map((c) => c.exerciseId));
}

// Any exercise with sets logged this session that no card shows. Rendered in a
// separate group so work actually performed is never invisible.
export function orphanedExerciseIds(
  cards: EffectiveCard[],
  setCounts: Record<string, number>,
): string[] {
  const shown = takenExerciseIds(cards);
  return Object.entries(setCounts)
    .filter(([id, n]) => n > 0 && !shown.has(id))
    .map(([id]) => id);
}
