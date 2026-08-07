import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { deleteSetLocal, logSetLocal } from "@/lib/offline/mutations";
import { drainOutbox, type Runners } from "@/lib/offline/sync";
import {
  assertConverged,
  createContext,
  quiesce,
  SESSION,
  SLOTS,
  type Ctx,
} from "@/lib/offline/__tests__/outboxHarness";

// Wrap every runner so fast-check owns the moment each one resolves. drainPass
// awaits its runners one at a time, so there is no concurrency inside a single
// drain and the scheduler is not asked to invent any. What it does control is
// where a mutation's await points land relative to a runner call, and how two
// overlapping drainOutbox calls interleave. Both are reachable on one JS thread
// in the real app, where drainOutbox is called from an effect and from an
// "online" listener while mutations run from UI handlers.
function scheduled(s: fc.Scheduler, r: Runners): Runners {
  return {
    logSet: s.scheduleFunction(r.logSet),
    deleteSet: s.scheduleFunction(r.deleteSet),
    updateSet: s.scheduleFunction(r.updateSet),
    swapExercise: s.scheduleFunction(r.swapExercise),
    undoSwap: s.scheduleFunction(r.undoSwap),
    finishSession: s.scheduleFunction(r.finishSession),
  };
}

async function seedSets(ctx: Ctx, count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const set = await logSetLocal(
      ctx.store,
      SESSION,
      SLOTS[i % SLOTS.length],
      { reps: 8, weight: 135, rirLow: null, rirHigh: null },
      ctx.nextId,
    );
    ids.push(set.id);
  }
  return ids;
}

describe("the outbox converges when a mutation lands mid drain", () => {
  it("survives a delete arriving while its own insert is in flight", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.scheduler(),
        fc.integer({ min: 1, max: 4 }),
        fc.nat(),
        async (s, count, pick) => {
          const ctx = await createContext([]);
          const ids = await seedSets(ctx, count);
          const racing = scheduled(s, ctx.runners);

          // A drain is in flight and is not awaited yet.
          const draining = drainOutbox(ctx.store, racing);
          // A delete is scheduled to land somewhere inside it.
          s.scheduleSequence([
            {
              builder: () => deleteSetLocal(ctx.store, ids[pick % ids.length]),
              label: "delete mid drain",
            },
          ]);

          await s.waitIdle();
          await draining;

          await quiesce(ctx);
          await assertConverged(ctx);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("survives two overlapping drains competing for the queue", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.scheduler(),
        fc.integer({ min: 1, max: 4 }),
        async (s, count) => {
          const ctx = await createContext([]);
          await seedSets(ctx, count);
          const racing = scheduled(s, ctx.runners);

          // The second call hits the module level `running` flag and should set
          // `rerun` rather than running concurrently or being dropped.
          const first = drainOutbox(ctx.store, racing);
          const second = drainOutbox(ctx.store, racing);

          await s.waitIdle();
          await Promise.all([first, second]);

          await quiesce(ctx);
          await assertConverged(ctx);
          // No op was delivered twice by the overlap itself.
          expect(ctx.server.sets.size).toBe(count);
        },
      ),
      { numRuns: 100 },
    );
  });
});
