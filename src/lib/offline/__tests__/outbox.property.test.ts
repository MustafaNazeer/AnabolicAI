import fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  deleteSetLocal,
  editSetLocal,
  finishLocal,
  logSetLocal,
  swapLocal,
  undoSwapLocal,
} from "@/lib/offline/mutations";
import { drainOutbox } from "@/lib/offline/sync";
import {
  assertConverged,
  createContext,
  outcomeArb,
  quiesce,
  REPLACEMENTS,
  SESSION,
  SLOTS,
  type Ctx,
  type Outcome,
} from "@/lib/offline/__tests__/outboxHarness";

// Every generated value is legal by construction, so the drop branch is never
// entered on account of bad input. Reps at least 1 and weight not negative are
// exactly what logSet validates in actions.ts.
const repsArb = fc.integer({ min: 1, max: 20 });
const weightArb = fc.integer({ min: 0, max: 500 });
const rirArb = fc.option(
  fc
    .tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 5 }))
    .map(([a, b]): [number, number] => (a <= b ? [a, b] : [b, a])),
  { nil: null },
);

// fast-check 4.9.0 constrains AsyncCommand's Model parameter to `extends
// object`, so the plan's `unknown` does not compile against the installed
// package. This property never inspects the model half of the pair, so an
// empty object stands in for it.
type Cmd = fc.AsyncCommand<object, Ctx>;

class LogSet implements Cmd {
  constructor(
    readonly slot: number,
    readonly reps: number,
    readonly weight: number,
    readonly rir: [number, number] | null,
  ) {}
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    await logSetLocal(
      ctx.store,
      SESSION,
      SLOTS[this.slot % SLOTS.length],
      {
        reps: this.reps,
        weight: this.weight,
        rirLow: this.rir ? this.rir[0] : null,
        rirHigh: this.rir ? this.rir[1] : null,
      },
      ctx.nextId,
    );
  }
  toString = () =>
    `log(slot ${this.slot % SLOTS.length}, ${this.reps} for ${this.weight})`;
}

class DeleteSet implements Cmd {
  constructor(readonly pick: number) {}
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    const sets = await ctx.store.listSets(SESSION);
    if (sets.length === 0) return;
    await deleteSetLocal(ctx.store, sets[this.pick % sets.length].id);
  }
  toString = () => `delete(#${this.pick})`;
}

class EditSet implements Cmd {
  constructor(
    readonly pick: number,
    readonly reps: number,
    readonly weight: number,
  ) {}
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    const sets = await ctx.store.listSets(SESSION);
    if (sets.length === 0) return;
    await editSetLocal(ctx.store, sets[this.pick % sets.length].id, {
      reps: this.reps,
      weight: this.weight,
      rirLow: null,
      rirHigh: null,
    });
  }
  toString = () => `edit(#${this.pick} to ${this.reps} for ${this.weight})`;
}

class Swap implements Cmd {
  constructor(
    readonly slot: number,
    readonly pick: number,
  ) {}
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    const original = SLOTS[this.slot % SLOTS.length];
    const pool = REPLACEMENTS[original];
    await swapLocal(ctx.store, SESSION, original, pool[this.pick % pool.length]);
  }
  toString = () => `swap(slot ${this.slot % SLOTS.length})`;
}

class UndoSwap implements Cmd {
  constructor(readonly slot: number) {}
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    await undoSwapLocal(ctx.store, SESSION, SLOTS[this.slot % SLOTS.length]);
  }
  toString = () => `undoSwap(slot ${this.slot % SLOTS.length})`;
}

class Finish implements Cmd {
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    ctx.finishIssued.value = true;
    await finishLocal(ctx.store, SESSION);
  }
  toString = () => "finish";
}

class Drain implements Cmd {
  check = () => true;
  async run(_m: object, ctx: Ctx) {
    await drainOutbox(ctx.store, ctx.runners);
  }
  toString = () => "drain";
}

const logArb = fc
  .tuple(fc.nat(), repsArb, weightArb, rirArb)
  .map(([s, r, w, rir]) => new LogSet(s, r, w, rir));
const deleteArb = fc.nat().map((p) => new DeleteSet(p));
const editArb = fc
  .tuple(fc.nat(), repsArb, weightArb)
  .map(([p, r, w]) => new EditSet(p, r, w));
const swapArb = fc.tuple(fc.nat(), fc.nat()).map(([s, p]) => new Swap(s, p));
const undoSwapArb = fc.nat().map((s) => new UndoSwap(s));
const finishArb = fc.constant(new Finish());
const drainArb = fc.constant(new Drain());

// All three type parameters are required here: with only two, TypeScript
// resolves the overload for synchronous Command instead of AsyncCommand,
// because a function returning Promise<void> is still assignable where void
// is expected.
//
// Logging is weighted well above every other command, because delete and edit
// each depend on a set already sitting on the device when they run. With every
// command equally likely, a delete or edit was generated before any log had
// landed often enough that it hit the empty-list no-op, which left
// deleteSetLocal's cancel-a-pending-insert path and editSetLocal's deliberate
// no-cancel path barely exercised. A single fc.oneof with explicit weights
// keeps every ratio in one place rather than spreading it across repeated
// array entries.
//
// size is raised to "max" alongside the weighting. fc.commands defaults to
// its "small" size, which caps the generated sequence length at 10 regardless
// of maxCommands, so a run averaged around 5 commands; that is too short for
// a heavier log weight to reliably land before a delete or edit even shows up.
// Measured before this change: 33/200 runs (16.5%) contained a real delete,
// 37/200 (18.5%) a real edit. After weighting alone (no size change), the
// measured ceiling across several weight combinations stayed in the 35 to 47
// percent range, matching a Monte Carlo model of the same length distribution.
// With size raised to "max" as well, measured runs with a real delete and a
// real edit both landed in the 64 to 80 percent range across repeated
// 200-run samples.
const commandsArb = fc.commands<object, Ctx, false>(
  [
    fc.oneof(
      { weight: 9, arbitrary: logArb },
      { weight: 5, arbitrary: deleteArb },
      { weight: 5, arbitrary: editArb },
      { weight: 1, arbitrary: swapArb },
      { weight: 1, arbitrary: undoSwapArb },
      { weight: 1, arbitrary: finishArb },
      { weight: 1, arbitrary: drainArb },
    ),
  ],
  { maxCommands: 30, size: "max" },
);

describe("the offline outbox converges with the server", () => {
  it("converges under duplicate delivery and partial failure", async () => {
    await fc.assert(
      fc.asyncProperty(
        commandsArb,
        fc.array(outcomeArb, { minLength: 0, maxLength: 120 }),
        async (cmds, weather: Outcome[]) => {
          let ctx: Ctx | null = null;
          const setup = async () => {
            ctx = await createContext(weather);
            return { model: {}, real: ctx };
          };
          await fc.asyncModelRun(setup, cmds);
          const final = ctx as Ctx | null;
          if (!final) throw new Error("setup never ran");
          await quiesce(final);
          await assertConverged(final);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("keeps every replacement pool disjoint, which is what keeps a generated swap legal", () => {
    const all = SLOTS.flatMap((s) => REPLACEMENTS[s]);
    // A replacement is never a routine exercise, so a swap can never name an
    // exercise already in the workout.
    expect(all.filter((r) => (SLOTS as readonly string[]).includes(r))).toEqual([]);
    // No two slots share a replacement, so a second swap can never collide with
    // another slot's active replacement.
    expect(new Set(all).size).toBe(all.length);
    // Every slot has a pool, so no generated swap falls through to undefined.
    expect(SLOTS.every((s) => (REPLACEMENTS[s]?.length ?? 0) > 0)).toBe(true);
  });
});
