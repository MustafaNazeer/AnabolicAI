import type { LocalSet } from "@/lib/offline/store";
import type { Swap } from "@/lib/workout/swap";

export type SessionState = { sets: LocalSet[]; swaps: Swap[] };

function setKeys(sets: LocalSet[]): string[] {
  return sets.map((s) => `${s.id}:${s.setNumber}:${s.syncState}`).sort();
}

function swapKeys(swaps: Swap[]): string[] {
  return swaps.map((s) => `${s.originalExerciseId}:${s.replacementExerciseId}`).sort();
}

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

/**
 * True when nothing the log screen renders has changed, so a caller can skip a
 * view transition instead of animating a no-op.
 *
 * Array order is ignored on purpose. Every source sorts the sets by set number
 * alone, which is not a total order because two sets on different exercises can
 * share a number, so ties arrive in an arbitrary order from Postgres and from
 * IndexedDB alike. Each card renders only its own exercise's sets, so cross
 * exercise order is invisible; within one exercise the order follows the set
 * number, which is part of the key, so a real renumbering still counts.
 */
export function sameSessionState(a: SessionState, b: SessionState): boolean {
  return (
    sameKeys(setKeys(a.sets), setKeys(b.sets)) &&
    sameKeys(swapKeys(a.swaps), swapKeys(b.swaps))
  );
}
