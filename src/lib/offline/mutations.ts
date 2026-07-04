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
  input: { reps: number; weight: number; rir: number },
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
    rir: input.rir,
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
      rir: input.rir,
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

export async function finishLocal(
  store: OfflineStore,
  sessionId: string,
): Promise<void> {
  await store.enqueue({ type: "finishSession", sessionId, payload: {} });
}
