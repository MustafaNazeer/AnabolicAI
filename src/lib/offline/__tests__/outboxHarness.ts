import fc from "fast-check";
import { expect } from "vitest";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import { seedSession } from "@/lib/offline/mutations";
import type { OfflineStore, Snapshot } from "@/lib/offline/store";
import { drainOutbox, type RunResult, type Runners } from "@/lib/offline/sync";
import {
  applyDeleteSet,
  applyFinishSession,
  applyLogSet,
  applySwapExercise,
  applyUndoSwap,
  applyUpdateSet,
  createServerModel,
  swapOriginal,
  swapSession,
  type ServerModel,
  type ServerResult,
} from "@/lib/offline/__tests__/serverModel";

export const SESSION = "sess1";

// The three routine slots, and a private pool of replacements per slot. The
// pools are disjoint from each other and from the slots, so a generated swap is
// legal by construction: it can never name an exercise already in the workout,
// which is the precondition at actions.ts:197 that this harness deliberately
// does not model.
export const SLOTS = ["r0", "r1", "r2"] as const;
export const REPLACEMENTS: Record<string, readonly string[]> = {
  r0: ["r0a", "r0b"],
  r1: ["r1a", "r1b"],
  r2: ["r2a", "r2b"],
};

export type Outcome = "ok" | "retry" | "lostAck" | "drop";

export const outcomeArb: fc.Arbitrary<Outcome> = fc.constantFrom(
  "ok",
  "ok",
  "retry",
  "lostAck",
);

export type Ctx = {
  store: OfflineStore;
  server: ServerModel;
  runners: Runners;
  weather: Outcome[];
  cursor: { i: number };
  nextId: () => string;
  finishIssued: { value: boolean };
};

function snapshot(): Snapshot {
  return {
    sessionId: SESSION,
    routineName: "Push Day",
    restSeconds: 120,
    exercises: SLOTS.map((id) => ({
      exerciseId: id,
      name: id,
      muscleGroup: null,
      isDefault: true,
      defaultSets: 3,
    })),
    lastByExercise: {},
    swaps: [],
    library: [],
  };
}

// One runner call: consult the weather, then apply to the server model, then
// map the server's answer the way buildRunners in ActiveWorkout.tsx does.
function step(
  ctx: { weather: Outcome[]; cursor: { i: number } },
  apply: () => ServerResult,
): RunResult {
  const outcome = ctx.weather[ctx.cursor.i] ?? "ok";
  ctx.cursor.i += 1;
  // The request never reached the server, so nothing is applied.
  if (outcome === "retry") return { ok: false, kind: "retry" };
  // The server rejected the input as unfixable and applied nothing.
  if (outcome === "drop") return { ok: false, kind: "drop" };
  const res = apply();
  if (!res.ok) return { ok: false, kind: res.retryable ? "retry" : "drop" };
  // The write committed and the answer was lost on the way back, so the client
  // retries and delivers the very same op again. This is duplicate delivery.
  if (outcome === "lostAck") return { ok: false, kind: "retry" };
  return { ok: true };
}

export function makeRunners(ctx: {
  server: ServerModel;
  weather: Outcome[];
  cursor: { i: number };
}): Runners {
  return {
    async logSet(p) {
      return step(ctx, () => applyLogSet(ctx.server, p));
    },
    async deleteSet(p) {
      return step(ctx, () => applyDeleteSet(ctx.server, p));
    },
    async updateSet(p) {
      return step(ctx, () => applyUpdateSet(ctx.server, p));
    },
    async swapExercise(p) {
      return step(ctx, () => applySwapExercise(ctx.server, p));
    },
    async undoSwap(p) {
      return step(ctx, () => applyUndoSwap(ctx.server, p));
    },
    async finishSession(p) {
      return step(ctx, () => applyFinishSession(ctx.server, p));
    },
  };
}

export async function createContext(weather: Outcome[]): Promise<Ctx> {
  const store = createMemoryStore();
  await seedSession(store, snapshot(), []);
  const server = createServerModel();
  const cursor = { i: 0 };
  let counter = 0;
  const partial = { server, weather, cursor };
  return {
    store,
    server,
    runners: makeRunners(partial),
    weather,
    cursor,
    // Deterministic, so a replayed counterexample produces identical ids.
    nextId: () => `set-${(counter += 1)}`,
    finishIssued: { value: false },
  };
}

// Run the network healthy until the outbox is empty. Everything past the end of
// the generated weather reads as "ok", so moving the cursor to the end is what
// restores the connection.
export async function quiesce(ctx: Ctx): Promise<void> {
  ctx.cursor.i = ctx.weather.length;
  for (let guard = 0; guard < 50; guard += 1) {
    await drainOutbox(ctx.store, ctx.runners);
    const left = await ctx.store.listOutbox();
    if (left.length === 0) return;
  }
  throw new Error("the outbox never drained with a healthy connection");
}

type Comparable = {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

function byId(a: Comparable, b: Comparable): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export async function assertConverged(ctx: Ctx): Promise<void> {
  const deviceSets = await ctx.store.listSets(SESSION);
  const device: Comparable[] = deviceSets
    .map((s) => ({
      id: s.id,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      rirLow: s.rirLow,
      rirHigh: s.rirHigh,
    }))
    .sort(byId);

  const server: Comparable[] = [...ctx.server.sets.values()]
    .filter((r) => r.sessionId === SESSION)
    .map((r) => ({
      id: r.id,
      exerciseId: r.exerciseId,
      setNumber: r.setNumber,
      reps: r.reps,
      weight: r.weight,
      rirLow: r.rirLow,
      rirHigh: r.rirHigh,
    }))
    .sort(byId);

  expect(device).toEqual(server);

  // Every set the device still holds has been acknowledged. Only logSet writes
  // this field, in drainPass, so a set left pending means its insert never
  // completed.
  expect(deviceSets.filter((s) => s.syncState !== "synced")).toEqual([]);

  const snap = await ctx.store.getSnapshot(SESSION);
  const deviceSwaps = (snap?.swaps ?? [])
    .map((s) => `${s.originalExerciseId} to ${s.replacementExerciseId}`)
    .sort();
  const serverSwaps = [...ctx.server.swaps.entries()]
    .filter(([k]) => swapSession(k) === SESSION)
    .map(([k, v]) => `${swapOriginal(k)} to ${v}`)
    .sort();
  expect(deviceSwaps).toEqual(serverSwaps);

  expect(ctx.server.finished.has(SESSION)).toBe(ctx.finishIssued.value);
}
