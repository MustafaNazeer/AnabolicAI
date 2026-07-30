import { describe, it, expect, vi } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import { drainOutbox, type Runners, type RunResult } from "@/lib/offline/sync";
import type { LocalSet } from "@/lib/offline/store";

const ok: RunResult = { ok: true };
const retry: RunResult = { ok: false, kind: "retry" };
const drop: RunResult = { ok: false, kind: "drop" };

const pendingSet = (id: string): LocalSet => ({
  id,
  sessionId: "s1",
  exerciseId: "e1",
  setNumber: 1,
  reps: 5,
  weight: 100,
  rir: 2,
  syncState: "pending",
});

const runners = (over: Partial<Runners> = {}): Runners => ({
  logSet: vi.fn(async () => ok),
  deleteSet: vi.fn(async () => ok),
  finishSession: vi.fn(async () => ok),
  swapExercise: vi.fn(async () => ok),
  undoSwap: vi.fn(async () => ok),
  ...over,
});

describe("drainOutbox", () => {
  it("syncs a logSet: dequeues and marks the set synced", async () => {
    const store = createMemoryStore();
    await store.putSet(pendingSet("a"));
    await store.enqueue({
      type: "logSet",
      sessionId: "s1",
      payload: { id: "a", exerciseId: "e1", setNumber: 1, reps: 5, weight: 100, rir: 2 },
    });
    await drainOutbox(store, runners());
    expect(await store.listOutbox()).toEqual([]);
    expect((await store.getSet("a"))?.syncState).toBe("synced");
  });

  it("halts on a retry result and preserves the remaining queue in order", async () => {
    const store = createMemoryStore();
    await store.enqueue({ type: "deleteSet", sessionId: "s1", payload: { id: "a" } });
    await store.enqueue({ type: "finishSession", sessionId: "s1", payload: {} });
    const r = runners({ deleteSet: vi.fn(async () => retry) });
    await drainOutbox(store, r);
    expect((await store.listOutbox()).map((o) => o.type)).toEqual([
      "deleteSet",
      "finishSession",
    ]);
    expect(r.finishSession).not.toHaveBeenCalled();
  });

  it("drops an op that can never succeed and continues", async () => {
    const store = createMemoryStore();
    await store.enqueue({ type: "deleteSet", sessionId: "s1", payload: { id: "a" } });
    await store.enqueue({ type: "finishSession", sessionId: "s1", payload: {} });
    const r = runners({ deleteSet: vi.fn(async () => drop) });
    await drainOutbox(store, r);
    expect(await store.listOutbox()).toEqual([]);
    expect(r.finishSession).toHaveBeenCalledOnce();
  });

  it("is single-flight: a concurrent call does not double-process", async () => {
    const store = createMemoryStore();
    await store.enqueue({ type: "finishSession", sessionId: "s1", payload: {} });
    let calls = 0;
    const r = runners({
      finishSession: vi.fn(async () => {
        calls++;
        await new Promise((res) => setTimeout(res, 5));
        return ok;
      }),
    });
    await Promise.all([drainOutbox(store, r), drainOutbox(store, r)]);
    expect(calls).toBe(1);
  });

  it("processes ops enqueued during the drain (re-loops)", async () => {
    const store = createMemoryStore();
    await store.putSet(pendingSet("a"));
    await store.enqueue({
      type: "logSet",
      sessionId: "s1",
      payload: { id: "a", exerciseId: "e1", setNumber: 1, reps: 5, weight: 100, rir: 2 },
    });
    const deleteSet = vi.fn(async () => ok);
    const logSet = vi.fn(async () => {
      // A compensating delete queued while this op is in flight must still flush
      // in the same drain.
      await store.enqueue({ type: "deleteSet", sessionId: "s1", payload: { id: "a" } });
      return ok;
    });
    await drainOutbox(store, runners({ logSet, deleteSet }));
    expect(deleteSet).toHaveBeenCalledOnce();
    expect(await store.listOutbox()).toEqual([]);
  });
});

describe("draining swap ops", () => {
  it("runs a swap and clears it from the outbox", async () => {
    const store = createMemoryStore();
    await store.enqueue({
      type: "swapExercise",
      sessionId: "sess1",
      payload: { originalExerciseId: "pecdeck", replacementExerciseId: "bench" },
    });

    const calls: string[] = [];
    await drainOutbox(
      store,
      runners({
        swapExercise: async (p) => {
          calls.push(`${p.originalExerciseId}->${p.replacementExerciseId}`);
          return ok;
        },
      }),
    );

    expect(calls).toEqual(["pecdeck->bench"]);
    expect(await store.listOutbox()).toHaveLength(0);
  });

  it("drops a swap the server rejects as invalid and keeps draining", async () => {
    const store = createMemoryStore();
    await store.enqueue({
      type: "swapExercise",
      sessionId: "sess1",
      payload: { originalExerciseId: "pecdeck", replacementExerciseId: "bench" },
    });
    await store.enqueue({
      type: "undoSwap",
      sessionId: "sess1",
      payload: { originalExerciseId: "fly" },
    });

    let undone = 0;
    await drainOutbox(
      store,
      runners({
        swapExercise: async () => drop,
        undoSwap: async () => {
          undone += 1;
          return ok;
        },
      }),
    );

    expect(undone).toBe(1);
    expect(await store.listOutbox()).toHaveLength(0);
  });

  it("halts on a retryable swap failure and leaves it queued", async () => {
    const store = createMemoryStore();
    await store.enqueue({
      type: "swapExercise",
      sessionId: "sess1",
      payload: { originalExerciseId: "pecdeck", replacementExerciseId: "bench" },
    });

    await drainOutbox(store, runners({ swapExercise: async () => retry }));

    expect(await store.listOutbox()).toHaveLength(1);
  });
});
