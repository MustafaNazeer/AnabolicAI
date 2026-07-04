export type SyncState = "pending" | "synced";

export type LocalSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rir: number;
  syncState: SyncState;
};

export type SnapshotExercise = {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  isDefault: boolean;
  defaultSets: number;
};

export type LastRef = {
  set_number: number;
  reps: number;
  weight: number;
  rir: number;
};

export type Snapshot = {
  sessionId: string;
  routineName: string;
  restSeconds: number;
  exercises: SnapshotExercise[];
  lastByExercise: Record<string, LastRef[]>;
};

export type LogPayload = {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rir: number;
};

export type OutboxOp =
  | { type: "logSet"; sessionId: string; payload: LogPayload }
  | { type: "deleteSet"; sessionId: string; payload: { id: string } }
  | { type: "finishSession"; sessionId: string; payload: Record<string, never> };

export type QueuedOp = OutboxOp & { seq: number };

export interface OfflineStore {
  putSnapshot(s: Snapshot): Promise<void>;
  getSnapshot(sessionId: string): Promise<Snapshot | undefined>;
  putSet(s: LocalSet): Promise<void>;
  getSet(id: string): Promise<LocalSet | undefined>;
  listSets(sessionId: string): Promise<LocalSet[]>;
  removeSet(id: string): Promise<void>;
  enqueue(op: OutboxOp): Promise<number>;
  listOutbox(): Promise<QueuedOp[]>;
  dequeue(seq: number): Promise<void>;
  cancelLogSet(id: string): Promise<void>;
}
