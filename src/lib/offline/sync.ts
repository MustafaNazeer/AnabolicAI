import type { LogPayload, OfflineStore, QueuedOp } from "@/lib/offline/store";

// "retry": leave the op queued and try again on the next trigger (network down,
// or any server error such as an expired token or a transient 500).
// "drop": the op can never succeed (client-side invalid input, which should not
// happen because we validate before enqueuing); discard it so the queue cannot
// wedge. Dropping is surfaced via console.warn.
export type RunResult = { ok: true } | { ok: false; kind: "retry" | "drop" };

export type Runners = {
  logSet(p: LogPayload & { sessionId: string }): Promise<RunResult>;
  deleteSet(p: { id: string; sessionId: string }): Promise<RunResult>;
  finishSession(p: { sessionId: string }): Promise<RunResult>;
};

let running = false;
let rerun = false;

async function runOne(runners: Runners, op: QueuedOp): Promise<RunResult> {
  if (op.type === "logSet") {
    return runners.logSet({ ...op.payload, sessionId: op.sessionId });
  }
  if (op.type === "deleteSet") {
    return runners.deleteSet({ id: op.payload.id, sessionId: op.sessionId });
  }
  return runners.finishSession({ sessionId: op.sessionId });
}

// One pass: process ops in seq order, re-reading the outbox after each sweep so
// ops enqueued mid-drain (e.g. a compensating delete, or finish) are picked up.
// Returns when the outbox is empty or a "retry" halts it.
async function drainPass(store: OfflineStore, runners: Runners): Promise<void> {
  for (;;) {
    const ops = await store.listOutbox();
    if (ops.length === 0) return;
    let halted = false;
    for (const op of ops) {
      const res = await runOne(runners, op);
      if (res.ok) {
        if (op.type === "logSet") {
          const s = await store.getSet(op.payload.id);
          if (s) await store.putSet({ ...s, syncState: "synced" });
        }
        await store.dequeue(op.seq);
      } else if (res.kind === "retry") {
        halted = true;
        break;
      } else {
        if (typeof console !== "undefined") {
          console.warn("onyx: dropping unsyncable op", op.type, op.seq);
        }
        await store.dequeue(op.seq);
      }
    }
    if (halted) return;
  }
}

// Coalescing single-flight: a call while a drain is in flight requests one more
// pass after it (so a finish/delete enqueued during a drain still flushes),
// rather than being dropped or running concurrently.
export async function drainOutbox(
  store: OfflineStore,
  runners: Runners,
): Promise<void> {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    do {
      rerun = false;
      await drainPass(store, runners);
    } while (rerun);
  } finally {
    running = false;
  }
}
