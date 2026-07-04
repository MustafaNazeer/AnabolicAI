import type {
  LocalSet,
  OfflineStore,
  OutboxOp,
  QueuedOp,
  Snapshot,
} from "@/lib/offline/store";

export function createMemoryStore(): OfflineStore {
  const snapshots = new Map<string, Snapshot>();
  const sets = new Map<string, LocalSet>();
  const outbox = new Map<number, QueuedOp>();
  let seq = 0;

  return {
    async putSnapshot(s) {
      snapshots.set(s.sessionId, s);
    },
    async getSnapshot(id) {
      return snapshots.get(id);
    },
    async putSet(s) {
      sets.set(s.id, s);
    },
    async getSet(id) {
      return sets.get(id);
    },
    async listSets(sessionId) {
      return [...sets.values()]
        .filter((s) => s.sessionId === sessionId)
        .sort((a, b) => a.setNumber - b.setNumber);
    },
    async removeSet(id) {
      sets.delete(id);
    },
    async enqueue(op: OutboxOp) {
      seq += 1;
      outbox.set(seq, { ...op, seq });
      return seq;
    },
    async listOutbox() {
      return [...outbox.values()].sort((a, b) => a.seq - b.seq);
    },
    async dequeue(s) {
      outbox.delete(s);
    },
    async cancelLogSet(id) {
      for (const [k, op] of outbox) {
        if (op.type === "logSet" && op.payload.id === id) outbox.delete(k);
      }
    },
  };
}
