import type { LogPayload } from "@/lib/offline/store";

// A reference replica of what the six server actions in src/lib/workout/actions.ts
// do to Postgres, holding only what the outbox can later observe. It is not a
// database: no row level security, no user scoping, no foreign keys and no
// routine_exercises. Exactly one precondition is modelled, and the comment on
// applySwapExercise says why.

export type ServerSetRow = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

// Mirrors the shape the real actions return: retryable false means the sync
// engine drops the op, true means it retries. See buildRunners in ActiveWorkout.
export type ServerResult = { ok: true } | { ok: false; retryable: boolean };

export type ServerModel = {
  sets: Map<string, ServerSetRow>;
  // Keyed the way the real unique constraint is, on session plus original.
  swaps: Map<string, string>;
  finished: Set<string>;
};

export function createServerModel(): ServerModel {
  return { sets: new Map(), swaps: new Map(), finished: new Set() };
}

// A null byte cannot appear in a session id or an exercise id, so neither half
// of the key can ever be mistaken for the other. Written as an escape rather
// than a literal control character, so the source file stays plain ASCII.
const SEP = "\u0000";

export function swapKey(sessionId: string, originalExerciseId: string): string {
  return `${sessionId}${SEP}${originalExerciseId}`;
}

// The key's shape stays private to this module. A caller comparing the server's
// swaps against the device's reads the halves back through these rather than
// splitting the string itself.
export function swapSession(key: string): string {
  return key.slice(0, key.indexOf(SEP));
}

export function swapOriginal(key: string): string {
  return key.slice(key.indexOf(SEP) + 1);
}

// upsert with { onConflict: "id", ignoreDuplicates: true }. A replay changes
// nothing and reports success, which is what lets a lost acknowledgement be
// retried safely.
export function applyLogSet(
  m: ServerModel,
  p: LogPayload & { sessionId: string },
): ServerResult {
  if (!m.sets.has(p.id)) {
    m.sets.set(p.id, {
      id: p.id,
      sessionId: p.sessionId,
      exerciseId: p.exerciseId,
      setNumber: p.setNumber,
      reps: p.reps,
      weight: p.weight,
      rirLow: p.rirLow,
      rirHigh: p.rirHigh,
    });
  }
  return { ok: true };
}

// delete().eq("id", setId). An absent id matches zero rows, which Postgres
// treats as success.
export function applyDeleteSet(
  m: ServerModel,
  p: { id: string },
): ServerResult {
  m.sets.delete(p.id);
  return { ok: true };
}

// update().eq("id", id). A missing id matches zero rows, which is a success
// rather than an error, and is why editSetLocal can queue an update behind an
// insert that may never have landed.
export function applyUpdateSet(
  m: ServerModel,
  p: {
    id: string;
    reps: number;
    weight: number;
    rirLow: number | null;
    rirHigh: number | null;
  },
): ServerResult {
  const row = m.sets.get(p.id);
  if (row) {
    m.sets.set(p.id, {
      ...row,
      reps: p.reps,
      weight: p.weight,
      rirLow: p.rirLow,
      rirHigh: p.rirHigh,
    });
  }
  return { ok: true };
}

export function applySwapExercise(
  m: ServerModel,
  p: {
    sessionId: string;
    originalExerciseId: string;
    replacementExerciseId: string;
  },
): ServerResult {
  // actions.ts:158.
  if (p.originalExerciseId === p.replacementExerciseId) {
    return { ok: false, retryable: false };
  }
  const key = swapKey(p.sessionId, p.originalExerciseId);
  // The one modelled precondition. On a replay the real action reads this same
  // row back at actions.ts:179, so line 192 removes the original from `present`
  // and line 193 adds the replacement to it, and the check at line 197 then
  // rejects with retryable false. So a second delivery of a valid swap is
  // dropped rather than accepted. The row it wanted to write is already here,
  // so the final state is correct either way.
  if (m.swaps.get(key) === p.replacementExerciseId) {
    return { ok: false, retryable: false };
  }
  m.swaps.set(key, p.replacementExerciseId);
  return { ok: true };
}

export function applyUndoSwap(
  m: ServerModel,
  p: { sessionId: string; originalExerciseId: string },
): ServerResult {
  m.swaps.delete(swapKey(p.sessionId, p.originalExerciseId));
  return { ok: true };
}

// update({ completed_at: ... }). Modelled as a flag rather than a timestamp,
// because a re-delivered finish overwrites it with a later value and comparing
// timestamps would fail for a reason that says nothing about correctness.
export function applyFinishSession(
  m: ServerModel,
  p: { sessionId: string },
): ServerResult {
  m.finished.add(p.sessionId);
  return { ok: true };
}
