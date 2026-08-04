import type { LocalSet, OfflineStore, Snapshot } from "@/lib/offline/store";

export function nextSetNumber(sets: LocalSet[], exerciseId: string): number {
  return sets.filter((s) => s.exerciseId === exerciseId).length + 1;
}

export async function seedSession(
  store: OfflineStore,
  snapshot: Snapshot,
  serverSets: LocalSet[],
): Promise<void> {
  await store.putSnapshot(snapshot);
  const existing = new Set(
    (await store.listSets(snapshot.sessionId)).map((s) => s.id),
  );
  for (const s of serverSets) {
    if (!existing.has(s.id)) await store.putSet({ ...s, syncState: "synced" });
  }
}

export async function logSetLocal(
  store: OfflineStore,
  sessionId: string,
  exerciseId: string,
  input: {
    reps: number;
    weight: number;
    rirLow: number | null;
    rirHigh: number | null;
  },
  idGen: () => string,
): Promise<LocalSet> {
  const setNumber = nextSetNumber(await store.listSets(sessionId), exerciseId);
  const set: LocalSet = {
    id: idGen(),
    sessionId,
    exerciseId,
    setNumber,
    reps: input.reps,
    weight: input.weight,
    rirLow: input.rirLow,
    rirHigh: input.rirHigh,
    syncState: "pending",
  };
  await store.putSet(set);
  await store.enqueue({
    type: "logSet",
    sessionId,
    payload: {
      id: set.id,
      exerciseId,
      setNumber,
      reps: input.reps,
      weight: input.weight,
      rirLow: input.rirLow,
      rirHigh: input.rirHigh,
    },
  });
  return set;
}

export async function deleteSetLocal(
  store: OfflineStore,
  id: string,
): Promise<void> {
  const set = await store.getSet(id);
  if (!set) return;
  await store.removeSet(id);
  // Cancel the queued insert if it has not been sent yet. We still enqueue a
  // delete: if the insert was already in flight and landed on the server, this
  // is the compensating cleanup; if it never left the device, deleting an
  // absent id is a harmless server no-op. This closes the race where deleting a
  // pending set mid-sync would otherwise resurrect the row on reload.
  if (set.syncState === "pending") {
    await store.cancelLogSet(id);
  }
  await store.enqueue({
    type: "deleteSet",
    sessionId: set.sessionId,
    payload: { id },
  });
}

export async function editSetLocal(
  store: OfflineStore,
  id: string,
  input: {
    reps: number;
    weight: number;
    rirLow: number | null;
    rirHigh: number | null;
  },
): Promise<void> {
  const set = await store.getSet(id);
  if (!set) return;
  await store.putSet({ ...set, ...input });
  // A queued insert is deliberately NOT cancelled. logSet upserts with
  // ignoreDuplicates, so a replacement insert for a row that already landed is
  // ignored and the server would keep the old numbers forever. Queueing an
  // update instead is correct in every case: the insert runs first and this
  // corrects it, or there is no insert, or the insert was dropped as invalid
  // and this matches zero rows, which is a success rather than an error.
  await store.enqueue({
    type: "updateSet",
    sessionId: set.sessionId,
    payload: { id, ...input },
  });
}

// The swap is applied to the cached snapshot immediately so the screen reacts
// with no connection, and queued for the server. Sets never reference a swap
// row, so a swap arriving after its own sets is harmless.
export async function swapLocal(
  store: OfflineStore,
  sessionId: string,
  originalExerciseId: string,
  replacementExerciseId: string,
): Promise<void> {
  const snapshot = await store.getSnapshot(sessionId);
  if (!snapshot) return;
  const swaps = snapshot.swaps.filter(
    (s) => s.originalExerciseId !== originalExerciseId,
  );
  swaps.push({ originalExerciseId, replacementExerciseId });
  await store.putSnapshot({ ...snapshot, swaps });
  await store.enqueue({
    type: "swapExercise",
    sessionId,
    payload: { originalExerciseId, replacementExerciseId },
  });
}

export async function undoSwapLocal(
  store: OfflineStore,
  sessionId: string,
  originalExerciseId: string,
): Promise<void> {
  const snapshot = await store.getSnapshot(sessionId);
  if (!snapshot) return;
  await store.putSnapshot({
    ...snapshot,
    swaps: snapshot.swaps.filter(
      (s) => s.originalExerciseId !== originalExerciseId,
    ),
  });
  await store.enqueue({
    type: "undoSwap",
    sessionId,
    payload: { originalExerciseId },
  });
}

export async function finishLocal(
  store: OfflineStore,
  sessionId: string,
): Promise<void> {
  await store.enqueue({ type: "finishSession", sessionId, payload: {} });
}
