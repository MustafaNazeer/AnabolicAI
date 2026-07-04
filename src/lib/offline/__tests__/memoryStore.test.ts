import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import type { LocalSet, Snapshot } from "@/lib/offline/store";

const set = (id: string, over: Partial<LocalSet> = {}): LocalSet => ({
  id,
  sessionId: "s1",
  exerciseId: "e1",
  setNumber: 1,
  reps: 5,
  weight: 100,
  rir: 2,
  syncState: "pending",
  ...over,
});

describe("memoryStore", () => {
  it("round-trips a snapshot", async () => {
    const store = createMemoryStore();
    const snap: Snapshot = {
      sessionId: "s1",
      routineName: "Push",
      restSeconds: 120,
      exercises: [],
      lastByExercise: {},
    };
    await store.putSnapshot(snap);
    expect(await store.getSnapshot("s1")).toEqual(snap);
    expect(await store.getSnapshot("nope")).toBeUndefined();
  });

  it("stores and lists sets by session, and removes them", async () => {
    const store = createMemoryStore();
    await store.putSet(set("a"));
    await store.putSet(set("b", { sessionId: "s2" }));
    expect((await store.listSets("s1")).map((s) => s.id)).toEqual(["a"]);
    await store.removeSet("a");
    expect(await store.listSets("s1")).toEqual([]);
  });

  it("lists sets ordered by setNumber", async () => {
    const store = createMemoryStore();
    await store.putSet(set("a", { setNumber: 2 }));
    await store.putSet(set("b", { setNumber: 1 }));
    expect((await store.listSets("s1")).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("enqueues in FIFO seq order and dequeues by seq", async () => {
    const store = createMemoryStore();
    const s1 = await store.enqueue({
      type: "deleteSet",
      sessionId: "s1",
      payload: { id: "a" },
    });
    const s2 = await store.enqueue({
      type: "finishSession",
      sessionId: "s1",
      payload: {},
    });
    expect(s2).toBeGreaterThan(s1);
    expect((await store.listOutbox()).map((o) => o.seq)).toEqual([s1, s2]);
    await store.dequeue(s1);
    expect((await store.listOutbox()).map((o) => o.seq)).toEqual([s2]);
  });

  it("cancelLogSet removes the queued logSet op for a given set id only", async () => {
    const store = createMemoryStore();
    await store.enqueue({
      type: "logSet",
      sessionId: "s1",
      payload: { id: "a", exerciseId: "e1", setNumber: 1, reps: 5, weight: 100, rir: 2 },
    });
    await store.enqueue({
      type: "logSet",
      sessionId: "s1",
      payload: { id: "b", exerciseId: "e1", setNumber: 2, reps: 5, weight: 100, rir: 2 },
    });
    await store.cancelLogSet("a");
    const ids = (await store.listOutbox()).map((o) =>
      o.type === "logSet" ? o.payload.id : null,
    );
    expect(ids).toEqual(["b"]);
  });
});
