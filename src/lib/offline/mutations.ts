import type { LocalSet, OfflineStore, Snapshot } from "@/lib/offline/store";

export function nextSetNumber(sets: LocalSet[], exerciseId: string): number {
  return sets.filter((s) => s.exerciseId === exerciseId).length + 1;
}

// servedOffline says the document this render came from could not have been
// fetched just now, so it must have been served from the cache.
export async function seedSession(
  store: OfflineStore,
  snapshot: Snapshot,
  serverSets: LocalSet[],
  servedOffline = false,
): Promise<void> {
  // The incoming snapshot is only authoritative when it is a live render, and
  // two things can make the local copy the fresher one. First, the outbox is
  // exactly the record of what the server has not seen yet, so while the
  // device still holds unsynced swap work for this session its swaps are ahead
  // of the server's. Second, a page served offline came out of the cache
  // frozen at whatever it held when it was warmed, so it is older than local
  // state however empty the outbox is: a swap made online drains immediately
  // and leaves nothing queued, yet the cached document still predates it.
  // Outside both cases the device has nothing the server does not already
  // know, so the incoming snapshot is the fresher copy and wins, including a
  // swap or undo made elsewhere that this device has never seen.
  const local = await store.getSnapshot(snapshot.sessionId);
  const outbox = await store.listOutbox();
  const pending = outbox.some(
    (op) =>
      op.sessionId === snapshot.sessionId &&
      (op.type === "swapExercise" || op.type === "undoSwap"),
  );
  await store.putSnapshot(
    local && (pending || servedOffline)
      ? { ...snapshot, swaps: local.swaps }
      : snapshot,
  );
  // Offline, the props came out of a cached document, and every id in it was
  // already seeded at the mount that warmed it. So the loop below can only put
  // back rows this device has deliberately deleted since, never anything new,
  // and there is nothing to gain by running it at all. A queued delete alone
  // is not enough to protect against that: a delete made online drains and
  // dequeues, leaving no tombstone behind, while the cached document still
  // carries the row. Re-adding it would be invisible, since it comes back as
  // synced with no pending dot, and permanent, because draining a deleteSet
  // takes no local action. It would also inflate nextSetNumber, so the next
  // real set would sync to the server under the wrong set number.
  //
  // The accepted cost: a device whose IndexedDB was cleared while this cached
  // document survived renders an empty workout offline. That is the honest
  // state, the sets really are gone from this device, and the next online
  // render restores all of them.
  if (servedOffline) return;
  // Online the render is live, but a delete can still be queued and unsent, so
  // the server legitimately returns a row this device has already removed. The
  // queued deletes are the record of exactly which ids that applies to.
  const deleted = new Set<string>();
  for (const op of outbox) {
    if (op.type === "deleteSet" && op.sessionId === snapshot.sessionId) {
      deleted.add(op.payload.id);
    }
  }
  const existing = new Set(
    (await store.listSets(snapshot.sessionId)).map((s) => s.id),
  );
  for (const s of serverSets) {
    if (!existing.has(s.id) && !deleted.has(s.id)) {
      await store.putSet({ ...s, syncState: "synced" });
    }
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
