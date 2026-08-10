import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import {
  seedSession,
  logSetLocal,
  deleteSetLocal,
  editSetLocal,
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

  // swapLocal stores swaps inside the snapshot. Seeding from a cached page
  // carries a server snapshot from before the swap, and an unconditional
  // putSnapshot would drop it from the screen while it sat queued in the
  // outbox. Only observable once an offline reload renders at all.
  it("keeps a local swap when seeding a server snapshot that predates it", async () => {
    const store = createMemoryStore();
    const snapshot: Snapshot = {
      sessionId: "s1",
      routineName: "Push Day",
      restSeconds: 120,
      exercises: [],
      lastByExercise: {},
      swaps: [],
      library: [],
    };
    await store.putSnapshot(snapshot);
    await swapLocal(store, "s1", "e1", "e2");

    await seedSession(store, snapshot, []);

    const after = await store.getSnapshot("s1");
    expect(after?.swaps).toEqual([
      { originalExerciseId: "e1", replacementExerciseId: "e2" },
    ]);
  });

  it("takes the server snapshot's other fields even while keeping local swaps", async () => {
    const store = createMemoryStore();
    const base: Snapshot = {
      sessionId: "s1",
      routineName: "Push Day",
      restSeconds: 120,
      exercises: [],
      lastByExercise: {},
      swaps: [],
      library: [],
    };
    await store.putSnapshot(base);
    await swapLocal(store, "s1", "e1", "e2");

    await seedSession(store, { ...base, restSeconds: 180 }, []);

    const after = await store.getSnapshot("s1");
    expect(after?.restSeconds).toBe(180);
    expect(after?.swaps).toHaveLength(1);
  });

  it("uses the server snapshot wholesale when nothing is stored yet", async () => {
    const store = createMemoryStore();
    const snapshot: Snapshot = {
      sessionId: "s2",
      routineName: "Pull Day",
      restSeconds: 90,
      exercises: [],
      lastByExercise: {},
      swaps: [{ originalExerciseId: "a", replacementExerciseId: "b" }],
      library: [],
    };
    await seedSession(store, snapshot, []);
    expect((await store.getSnapshot("s2"))?.swaps).toEqual(snapshot.swaps);
  });

  // A local snapshot existing is not enough on its own: it could just be stale,
  // written before a swap happened on another device. The outbox is what says
  // whether the device is actually ahead. With nothing queued for this
  // session, the device has no swap work the server has not seen, so the
  // server snapshot is the fresher copy and its swaps should win.
  it("uses the server's swaps when the local outbox holds no swap work", async () => {
    const store = createMemoryStore();
    const stale: Snapshot = {
      sessionId: "s3",
      routineName: "Leg Day",
      restSeconds: 90,
      exercises: [],
      lastByExercise: {},
      swaps: [{ originalExerciseId: "old", replacementExerciseId: "stale" }],
      library: [],
    };
    await store.putSnapshot(stale);

    const fromServer: Snapshot = {
      ...stale,
      swaps: [{ originalExerciseId: "c", replacementExerciseId: "d" }],
    };
    await seedSession(store, fromServer, []);

    expect((await store.getSnapshot("s3"))?.swaps).toEqual(fromServer.swaps);
  });

  // The reachable version of the swap bug. A swap made while online syncs
  // straight away, so by the time the device reloads there is nothing queued
  // to prove it is ahead, yet the cached document was captured before the
  // swap. The outbox rule alone would hand authority to that document and drop
  // the swap, and every set logged afterwards would be filed under the
  // exercise that was swapped away.
  it("keeps a local swap on an offline reload once the swap has synced", async () => {
    const store = createMemoryStore();
    const cached: Snapshot = {
      sessionId: "s4",
      routineName: "Push Day",
      restSeconds: 120,
      exercises: [],
      lastByExercise: {},
      swaps: [],
      library: [],
    };
    await store.putSnapshot(cached);
    await swapLocal(store, "s4", "e1", "e2");
    for (const op of await store.listOutbox()) await store.dequeue(op.seq);
    expect(await store.listOutbox()).toEqual([]);

    await seedSession(store, cached, [], true);

    expect((await store.getSnapshot("s4"))?.swaps).toEqual([
      { originalExerciseId: "e1", replacementExerciseId: "e2" },
    ]);
  });

  // The other half of the same rule: a live render is authoritative, so a swap
  // made on another device still overwrites a drained local one.
  it("lets a server swap win on an online mount with a drained outbox", async () => {
    const store = createMemoryStore();
    const base: Snapshot = {
      sessionId: "s5",
      routineName: "Push Day",
      restSeconds: 120,
      exercises: [],
      lastByExercise: {},
      swaps: [],
      library: [],
    };
    await store.putSnapshot(base);
    await swapLocal(store, "s5", "e1", "e2");
    for (const op of await store.listOutbox()) await store.dequeue(op.seq);

    const fromServer: Snapshot = {
      ...base,
      swaps: [{ originalExerciseId: "e3", replacementExerciseId: "e4" }],
    };
    await seedSession(store, fromServer, [], false);

    expect((await store.getSnapshot("s5"))?.swaps).toEqual(fromServer.swaps);
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

describe("editSetLocal", () => {
  it("changes the local row straight away so the screen updates offline", async () => {
    const store = createMemoryStore();
    await store.putSet(synced("a"));

    await editSetLocal(store, "a", {
      reps: 6,
      weight: 155,
      rirLow: 1,
      rirHigh: 2,
    });

    const row = await store.getSet("a");
    expect(row?.reps).toBe(6);
    expect(row?.weight).toBe(155);
    expect(row?.rirLow).toBe(1);
    expect(row?.rirHigh).toBe(2);
    // Set number and exercise are not editable.
    expect(row?.setNumber).toBe(1);
    expect(row?.exerciseId).toBe("e1");
  });

  it("queues an update for a set the server already has", async () => {
    const store = createMemoryStore();
    await store.putSet(synced("a"));

    await editSetLocal(store, "a", {
      reps: 6,
      weight: 155,
      rirLow: null,
      rirHigh: null,
    });

    const ops = await store.listOutbox();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("updateSet");
    expect(ops[0].payload).toMatchObject({ id: "a", reps: 6, weight: 155 });
  });

  // logSet upserts with ignoreDuplicates, so replacing a queued insert would be
  // ignored if that insert had already landed, leaving the server on the old
  // numbers. The insert is left alone and the update runs after it.
  it("leaves a queued insert in place and queues the update behind it", async () => {
    const store = createMemoryStore();
    const snapshot: Snapshot = {
      sessionId: "s1",
      routineName: "Push",
      restSeconds: 120,
      exercises: [],
      lastByExercise: {},
      swaps: [],
      library: [],
    };
    await seedSession(store, snapshot, []);
    const logged = await logSetLocal(
      store,
      "s1",
      "e1",
      { reps: 8, weight: 135, rirLow: null, rirHigh: null },
      idGen,
    );

    await editSetLocal(store, logged.id, {
      reps: 8,
      weight: 155,
      rirLow: null,
      rirHigh: null,
    });

    const ops = await store.listOutbox();
    expect(ops.map((o) => o.type)).toEqual(["logSet", "updateSet"]);
    expect((await store.getSet(logged.id))?.weight).toBe(155);
    expect((await store.getSet(logged.id))?.syncState).toBe("pending");
  });

  it("does nothing for an id that is not there", async () => {
    const store = createMemoryStore();
    await editSetLocal(store, "missing", {
      reps: 1,
      weight: 1,
      rirLow: null,
      rirHigh: null,
    });
    expect(await store.listOutbox()).toHaveLength(0);
  });
});
