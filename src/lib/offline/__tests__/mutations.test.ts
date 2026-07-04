import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import {
  seedSession,
  logSetLocal,
  deleteSetLocal,
  finishLocal,
  nextSetNumber,
} from "@/lib/offline/mutations";
import type { LocalSet } from "@/lib/offline/store";

let counter = 0;
const idGen = () => `id-${++counter}`;
const synced = (id: string, over: Partial<LocalSet> = {}): LocalSet => ({
  id,
  sessionId: "s1",
  exerciseId: "e1",
  setNumber: 1,
  reps: 5,
  weight: 100,
  rir: 2,
  syncState: "synced",
  ...over,
});

describe("mutations", () => {
  it("nextSetNumber counts only that exercise's sets", () => {
    const sets = [
      synced("a"),
      synced("b", { setNumber: 2 }),
      synced("c", { exerciseId: "e2" }),
    ];
    expect(nextSetNumber(sets, "e1")).toBe(3);
    expect(nextSetNumber(sets, "e2")).toBe(2);
  });

  it("logSetLocal adds a pending set and a logSet op with a fresh id", async () => {
    counter = 0;
    const store = createMemoryStore();
    const s = await logSetLocal(store, "s1", "e1", { reps: 8, weight: 135, rir: 1 }, idGen);
    expect(s).toMatchObject({
      id: "id-1",
      setNumber: 1,
      reps: 8,
      weight: 135,
      rir: 1,
      syncState: "pending",
    });
    expect(await store.listSets("s1")).toHaveLength(1);
    const ob = await store.listOutbox();
    expect(ob).toHaveLength(1);
    expect(ob[0].type).toBe("logSet");
  });

  it("assigns increasing set numbers per exercise", async () => {
    counter = 0;
    const store = createMemoryStore();
    const a = await logSetLocal(store, "s1", "e1", { reps: 5, weight: 100, rir: 2 }, idGen);
    const b = await logSetLocal(store, "s1", "e1", { reps: 5, weight: 100, rir: 2 }, idGen);
    expect(a.setNumber).toBe(1);
    expect(b.setNumber).toBe(2);
  });

  it("deleting a pending set removes it and cancels its queued op", async () => {
    counter = 0;
    const store = createMemoryStore();
    const s = await logSetLocal(store, "s1", "e1", { reps: 8, weight: 135, rir: 1 }, idGen);
    await deleteSetLocal(store, s.id);
    expect(await store.listSets("s1")).toEqual([]);
    expect(await store.listOutbox()).toEqual([]);
  });

  it("deleting a synced set enqueues a deleteSet op", async () => {
    const store = createMemoryStore();
    await store.putSet(synced("x"));
    await deleteSetLocal(store, "x");
    expect(await store.listSets("s1")).toEqual([]);
    const ob = await store.listOutbox();
    expect(ob).toHaveLength(1);
    expect(ob[0]).toMatchObject({ type: "deleteSet", payload: { id: "x" } });
  });

  it("deleting an unknown set is a no-op", async () => {
    const store = createMemoryStore();
    await deleteSetLocal(store, "ghost");
    expect(await store.listOutbox()).toEqual([]);
  });

  it("seedSession stores the snapshot and adds server sets without clobbering pending", async () => {
    counter = 0;
    const store = createMemoryStore();
    const pending = await logSetLocal(store, "s1", "e1", { reps: 8, weight: 135, rir: 1 }, idGen);
    await seedSession(
      store,
      { sessionId: "s1", routineName: "Push", restSeconds: 120, exercises: [], lastByExercise: {} },
      [synced("srv")],
    );
    const ids = (await store.listSets("s1")).map((s) => s.id).sort();
    expect(ids).toEqual([pending.id, "srv"].sort());
    expect((await store.getSet(pending.id))?.syncState).toBe("pending");
    expect(await store.getSnapshot("s1")).toBeDefined();
  });

  it("finishLocal enqueues a finishSession op", async () => {
    const store = createMemoryStore();
    await finishLocal(store, "s1");
    const ob = await store.listOutbox();
    expect(ob[0]).toMatchObject({ type: "finishSession", sessionId: "s1" });
  });
});
