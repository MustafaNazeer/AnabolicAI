import type { LogPayload, OfflineStore, QueuedOp } from "@/lib/offline/store";

export type RunResult = { ok: true } | { ok: false; kind: "network" | "validation" };

export type Runners = {
  logSet(p: LogPayload & { sessionId: string }): Promise<RunResult>;
  deleteSet(p: { id: string; sessionId: string }): Promise<RunResult>;
  finishSession(p: { sessionId: string }): Promise<RunResult>;
};

let draining = false;

async function runOne(runners: Runners, op: QueuedOp): Promise<RunResult> {
  if (op.type === "logSet") {
    return runners.logSet({ ...op.payload, sessionId: op.sessionId });
  }
  if (op.type === "deleteSet") {
    return runners.deleteSet({ id: op.payload.id, sessionId: op.sessionId });
  }
  return runners.finishSession({ sessionId: op.sessionId });
}

export async function drainOutbox(
  store: OfflineStore,
  runners: Runners,
): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    for (const op of await store.listOutbox()) {
      const res = await runOne(runners, op);
      if (res.ok) {
        if (op.type === "logSet") {
          const s = await store.getSet(op.payload.id);
          if (s) await store.putSet({ ...s, syncState: "synced" });
        }
        await store.dequeue(op.seq);
      } else if (res.kind === "network") {
        break;
      } else {
        await store.dequeue(op.seq);
      }
    }
  } finally {
    draining = false;
  }
}
