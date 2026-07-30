import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import {
  seedSession,
  logSetLocal,
  deleteSetLocal,
  finishLocal,
  nextSetNumber,
  swapLocal,
  undoSwapLocal,
} from "@/lib/offline/mutations";
import type { LocalSet, Snapshot } from "@/lib/offline/store";

let counter = 0;
const idGen = () => `id-${++counter}`;
const synced = (id: string, over: Partial<LocalSet> = {}): LocalSet => ({
  id,
  sessionId: "s1",
  exerciseId: "e1",
  setNumber: 1,
  reps: 5,
  weight: 100,
  rirLow: 2,
  rirHigh: 2,
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
    const s = await logSetLocal(store, "s1", "e1", { reps: 8, weight: 135, rirLow: 1, rirHigh: 1 }, idGen);
    expect(s).toMatchObject({
      id: "id-1",
      setNumber: 1,
      reps: 8,
      weight: 135,
      rirLow: 1,
      rirHigh: 1,
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
    const a = await logSetLocal(store, "s1", "e1", { reps: 5, weight: 100, rirLow: 2, rirHigh: 2 }, idGen);
    const b = await logSetLocal(store, "s1", "e1", { reps: 5, weight: 100, rirLow: 2, rirHigh: 2 }, idGen);
    expect(a.setNumber).toBe(1);
    expect(b.setNumber).toBe(2);
  });

  it("deleting a pending set cancels its insert and enqueues a compensating delete", async () => {
    counter = 0;
    const store = createMemoryStore();
    const s = await logSetLocal(store, "s1", "e1", { reps: 8, weight: 135, rirLow: 1, rirHigh: 1 }, idGen);
    await deleteSetLocal(store, s.id);
    expect(await store.listSets("s1")).toEqual([]);
    const ob = await store.listOutbox();
    // The queued logSet is cancelled; only a compensating deleteSet remains.
    expect(ob).toHaveLength(1);
    expect(ob[0]).toMatchObject({ type: "deleteSet", payload: { id: s.id } });
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
    const pending = await logSetLocal(store, "s1", "e1", { reps: 8, weight: 135, rirLow: 1, rirHigh: 1 }, idGen);
    await seedSession(
      store,
      {
        sessionId: "s1",
        routineName: "Push",
        restSeconds: 120,
        exercises: [],
        lastByExercise: {},
        swaps: [],
        library: [],
      },
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

const swapSnapshot: Snapshot = {
  sessionId: "sess1",
  routineName: "Push Day",
  restSeconds: 120,
  exercises: [
    {
      exerciseId: "pecdeck",
      name: "Pec Deck",
      muscleGroup: "chest",
      isDefault: true,
      defaultSets: 3,
    },
  ],
  lastByExercise: {},
  swaps: [],
  library: [],
};

describe("swapLocal", () => {
  it("records the swap in the snapshot and queues it", async () => {
    const store = createMemoryStore();
    await seedSession(store, swapSnapshot, []);

    await swapLocal(store, "sess1", "pecdeck", "bench");

    const snap = await store.getSnapshot("sess1");
    expect(snap?.swaps).toEqual([
      { originalExerciseId: "pecdeck", replacementExerciseId: "bench" },
    ]);
    const outbox = await store.listOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].type).toBe("swapExercise");
  });

  it("replaces the existing swap for a slot rather than adding a second", async () => {
    const store = createMemoryStore();
    await seedSession(store, swapSnapshot, []);

    await swapLocal(store, "sess1", "pecdeck", "bench");
    await swapLocal(store, "sess1", "pecdeck", "machine");

    const snap = await store.getSnapshot("sess1");
    expect(snap?.swaps).toEqual([
      { originalExerciseId: "pecdeck", replacementExerciseId: "machine" },
    ]);
    expect(await store.listOutbox()).toHaveLength(2);
  });

  it("does nothing when the session is not in the store", async () => {
    const store = createMemoryStore();
    await swapLocal(store, "missing", "pecdeck", "bench");
    expect(await store.listOutbox()).toHaveLength(0);
  });
});

describe("undoSwapLocal", () => {
  it("removes the swap and queues the undo", async () => {
    const store = createMemoryStore();
    await seedSession(store, swapSnapshot, []);
    await swapLocal(store, "sess1", "pecdeck", "bench");

    await undoSwapLocal(store, "sess1", "pecdeck");

    const snap = await store.getSnapshot("sess1");
    expect(snap?.swaps).toEqual([]);
    const outbox = await store.listOutbox();
    expect(outbox.map((o) => o.type)).toEqual(["swapExercise", "undoSwap"]);
  });
});

describe("logSetLocal with a range", () => {
  it("carries both ends into the set and the queued op", async () => {
    const store = createMemoryStore();
    await logSetLocal(
      store,
      "s1",
      "e1",
      { reps: 8, weight: 135, rirLow: 0, rirHigh: 1 },
      () => "new-id",
    );
    const set = await store.getSet("new-id");
    expect(set?.rirLow).toBe(0);
    expect(set?.rirHigh).toBe(1);
    const [op] = await store.listOutbox();
    expect(op).toMatchObject({
      type: "logSet",
      payload: { rirLow: 0, rirHigh: 1 },
    });
  });

  it("carries a blank RIR through as nulls", async () => {
    const store = createMemoryStore();
    await logSetLocal(
      store,
      "s1",
      "e1",
      { reps: 8, weight: 135, rirLow: null, rirHigh: null },
      () => "blank-id",
    );
    const set = await store.getSet("blank-id");
    expect(set?.rirLow).toBeNull();
    expect(set?.rirHigh).toBeNull();
  });
});
