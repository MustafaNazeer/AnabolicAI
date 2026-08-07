import fc from "fast-check";
import { describe, it } from "vitest";
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
// where a mutation's await points land relative to a runner call, which is
// reachable on one JS thread in the real app: drainOutbox is called from an
// effect while mutations run from UI handlers, so a delete can land between a
// runner call and its resolution. A second, overlapping drainOutbox call is
// also reachable the same way, an "online" listener firing while an effect's
// drain is still in flight, but that check is a plain synchronous read of the
// module level `running` flag, so it gives the scheduler no ordering to choose
// between. See the comment on the second test below for what is left worth
// asserting about that path.
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
  // waitIdle spends its first 50 microtask ticks warming up (fast-check's own
  // budget before it looks at what is pending) before it releases anything,
  // which is enough time for drainPass to already have issued its first
  // runner call. So the scheduler here only ever explores the delete landing
  // after that first call is already pending; it never reaches the delete
  // finishing before drainPass's first listOutbox() read captures the queue.
  // That earlier ordering, the delete beating the sweep to the queue, is the
  // one case where cancelLogSet actually changes what is sent to the server
  // (the insert is never sent at all, instead of being sent and then
  // deleted); this property does not reach it, and the finding below is
  // scoped to the ordering it does reach.
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

  it("the second call takes the coalescing path and returns rather than running concurrently", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.scheduler(),
        fc.integer({ min: 1, max: 4 }),
        async (s, count) => {
          const ctx = await createContext([]);
          await seedSets(ctx, count);
          const racing = scheduled(s, ctx.runners);

          // Reading the module level `running` flag is a plain synchronous
          // check, so `second` always sees it already true and takes the
          // `rerun = true; return;` branch before the scheduler is ever asked
          // to choose anything: there is no ordering here for fast-check to
          // explore, so this is not two drains genuinely competing for the
          // queue. What is still real is that the ops go on to drain through
          // the scheduled runners and the outbox still empties with the
          // second call resolved alongside the first, rather than the second
          // call running its own pass concurrently or its intent being
          // dropped on the floor.
          const first = drainOutbox(ctx.store, racing);
          const second = drainOutbox(ctx.store, racing);

          await s.waitIdle();
          await Promise.all([first, second]);

          await quiesce(ctx);
          await assertConverged(ctx);
        },
      ),
      { numRuns: 100 },
    );
  });
});
