import type {
  LocalSet,
  OfflineStore,
  OutboxOp,
  QueuedOp,
  Snapshot,
} from "@/lib/offline/store";

const DB_NAME = "onyx";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots", { keyPath: "sessionId" });
      }
      if (!db.objectStoreNames.contains("sets")) {
        const sets = db.createObjectStore("sets", { keyPath: "id" });
        sets.createIndex("bySession", "sessionId", { unique: false });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function store(db: IDBDatabase, name: string, mode: IDBTransactionMode) {
  return db.transaction(name, mode).objectStore(name);
}

// IndexedDB implementation of OfflineStore. Thin I/O adapter; verified
// on-device (the pure logic on top of it is unit-tested via the in-memory
// store). Guards for the server, where indexedDB is undefined.
export function createIdbStore(): OfflineStore {
  const available = typeof indexedDB !== "undefined";

  return {
    async putSnapshot(s) {
      if (!available) return;
      const db = await openDb();
      await reqToPromise(store(db, "snapshots", "readwrite").put(s));
    },
    async getSnapshot(id) {
      if (!available) return undefined;
      const db = await openDb();
      return (await reqToPromise(
        store(db, "snapshots", "readonly").get(id),
      )) as Snapshot | undefined;
    },
    async putSet(s) {
      if (!available) return;
      const db = await openDb();
      await reqToPromise(store(db, "sets", "readwrite").put(s));
    },
    async getSet(id) {
      if (!available) return undefined;
      const db = await openDb();
      return (await reqToPromise(store(db, "sets", "readonly").get(id))) as
        | LocalSet
        | undefined;
    },
    async listSets(sessionId) {
      if (!available) return [];
      const db = await openDb();
      const idx = store(db, "sets", "readonly").index("bySession");
      const rows = (await reqToPromise(idx.getAll(sessionId))) as LocalSet[];
      return rows.sort((a, b) => a.setNumber - b.setNumber);
    },
    async removeSet(id) {
      if (!available) return;
      const db = await openDb();
      await reqToPromise(store(db, "sets", "readwrite").delete(id));
    },
    async enqueue(op: OutboxOp) {
      if (!available) return 0;
      const db = await openDb();
      const key = await reqToPromise(
        store(db, "outbox", "readwrite").add(op as unknown as QueuedOp),
      );
      return key as number;
    },
    async listOutbox() {
      if (!available) return [];
      const db = await openDb();
      const rows = (await reqToPromise(
        store(db, "outbox", "readonly").getAll(),
      )) as QueuedOp[];
      return rows.sort((a, b) => a.seq - b.seq);
    },
    async dequeue(seq) {
      if (!available) return;
      const db = await openDb();
      await reqToPromise(store(db, "outbox", "readwrite").delete(seq));
    },
    async cancelLogSet(id) {
      if (!available) return;
      const db = await openDb();
      const rows = (await reqToPromise(
        store(db, "outbox", "readonly").getAll(),
      )) as QueuedOp[];
      const seqs = rows
        .filter((op) => op.type === "logSet" && op.payload.id === id)
        .map((op) => op.seq);
      const del = store(db, "outbox", "readwrite");
      await Promise.all(seqs.map((seq) => reqToPromise(del.delete(seq))));
    },
  };
}
