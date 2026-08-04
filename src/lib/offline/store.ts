import type { Exercise } from "@/lib/data/types";
import type { Swap } from "@/lib/workout/swap";

export type SyncState = "pending" | "synced";

export type LocalSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
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
  rirLow: number | null;
  rirHigh: number | null;
};

export type Snapshot = {
  sessionId: string;
  routineName: string;
  restSeconds: number;
  exercises: SnapshotExercise[];
  lastByExercise: Record<string, LastRef[]>;
  // Session scoped overrides, so an offline reload still renders the
  // replacement rather than snapping back to the routine.
  swaps: Swap[];
  // Cached so the exercise picker can search with no connection.
  library: Exercise[];
};

export type LogPayload = {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
  // Written by builds before the range change. Read when replaying a queued
  // op from an older build, never written. Removed once no device can still
  // hold a pre-range outbox entry.
  rir?: number;
};

export type OutboxOp =
  | { type: "logSet"; sessionId: string; payload: LogPayload }
  | { type: "deleteSet"; sessionId: string; payload: { id: string } }
  | { type: "finishSession"; sessionId: string; payload: Record<string, never> }
  | {
      type: "swapExercise";
      sessionId: string;
      payload: { originalExerciseId: string; replacementExerciseId: string };
    }
  | {
      type: "undoSwap";
      sessionId: string;
      payload: { originalExerciseId: string };
    }
  | {
      type: "updateSet";
      sessionId: string;
      payload: {
        id: string;
        reps: number;
        weight: number;
        rirLow: number | null;
        rirHigh: number | null;
      };
    };

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
