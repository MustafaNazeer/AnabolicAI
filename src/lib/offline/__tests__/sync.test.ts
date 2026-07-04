import { describe, it, expect, vi } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import { drainOutbox, type Runners, type RunResult } from "@/lib/offline/sync";
import type { LocalSet } from "@/lib/offline/store";

const ok: RunResult = { ok: true };
const net: RunResult = { ok: false, kind: "network" };
const val: RunResult = { ok: false, kind: "validation" };

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

  it("stops on a network failure and preserves the remaining queue in order", async () => {
    const store = createMemoryStore();
    await store.enqueue({ type: "deleteSet", sessionId: "s1", payload: { id: "a" } });
    await store.enqueue({ type: "finishSession", sessionId: "s1", payload: {} });
    const r = runners({ deleteSet: vi.fn(async () => net) });
    await drainOutbox(store, r);
    expect((await store.listOutbox()).map((o) => o.type)).toEqual([
      "deleteSet",
      "finishSession",
    ]);
    expect(r.finishSession).not.toHaveBeenCalled();
  });

  it("drops an op that fails validation and continues", async () => {
    const store = createMemoryStore();
    await store.enqueue({ type: "deleteSet", sessionId: "s1", payload: { id: "a" } });
    await store.enqueue({ type: "finishSession", sessionId: "s1", payload: {} });
    const r = runners({ deleteSet: vi.fn(async () => val) });
    await drainOutbox(store, r);
    expect(await store.listOutbox()).toEqual([]);
    expect(r.finishSession).toHaveBeenCalledOnce();
  });

  it("is single-flight: a concurrent call is a no-op", async () => {
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
});
