import { describe, it, expect } from "vitest";
import { buildDemoSeed } from "@/lib/demo/seed";

const NOW = new Date("2026-08-01T14:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("buildDemoSeed", () => {
  it("builds three routines of four exercises each", () => {
    const seed = buildDemoSeed(NOW);
    expect(seed.routines.map((r) => r.name)).toEqual([
      "Push Day",
      "Pull Day",
      "Leg Day",
    ]);
    for (const r of seed.routines) expect(r.exercises).toHaveLength(4);
  });

  it("builds 24 completed sessions", () => {
    const seed = buildDemoSeed(NOW);
    const sessions = seed.routines.flatMap((r) => r.sessions);
    expect(sessions).toHaveLength(24);
    for (const s of sessions) expect(s.completedAt).toBeTruthy();
  });

  // The charts window on recent activity. A hardcoded date would look right the
  // day it was written and leave a visitor staring at empty graphs months later.
  it("places every session inside the eight weeks before now", () => {
    const seed = buildDemoSeed(NOW);
    const times = seed.routines
      .flatMap((r) => r.sessions)
      .map((s) => new Date(s.startedAt).getTime());
    const oldest = Math.min(...times);
    const newest = Math.max(...times);
    expect(newest).toBeLessThan(NOW.getTime());
    expect(newest).toBeGreaterThan(NOW.getTime() - 3 * DAY);
    expect(oldest).toBeGreaterThan(NOW.getTime() - 60 * DAY);
  });

  it("moves with now rather than carrying fixed dates", () => {
    const a = buildDemoSeed(NOW);
    const b = buildDemoSeed(new Date(NOW.getTime() + 30 * DAY));
    const newest = (s: ReturnType<typeof buildDemoSeed>) =>
      Math.max(
        ...s.routines
          .flatMap((r) => r.sessions)
          .map((x) => new Date(x.startedAt).getTime()),
      );
    expect(newest(b) - newest(a)).toBe(30 * DAY);
  });

  it("increases the working weight over time for a given exercise", () => {
    const seed = buildDemoSeed(NOW);
    const bench = seed.routines
      .flatMap((r) => r.sessions)
      .flatMap((s) =>
        s.sets.map((set) => ({ ...set, at: new Date(s.startedAt).getTime() })),
      )
      .filter((s) => s.exerciseName === "Bench Press")
      .sort((x, y) => x.at - y.at);
    expect(bench.length).toBeGreaterThan(0);
    expect(bench[bench.length - 1].weight).toBeGreaterThan(bench[0].weight);
  });

  // The paired CHECK constraint rejects a half filled range outright.
  it("never emits a half filled reps in reserve range", () => {
    const seed = buildDemoSeed(NOW);
    for (const s of seed.routines
      .flatMap((r) => r.sessions)
      .flatMap((x) => x.sets)) {
      expect(s.rirLow === null).toBe(s.rirHigh === null);
      if (s.rirLow !== null && s.rirHigh !== null) {
        expect(s.rirLow).toBeLessThanOrEqual(s.rirHigh);
        expect(s.rirLow).toBeGreaterThanOrEqual(0);
        expect(s.rirHigh).toBeLessThanOrEqual(5);
      }
    }
  });

  it("builds one active goal and one achieved goal", () => {
    const seed = buildDemoSeed(NOW);
    expect(seed.goals).toHaveLength(2);
    expect(seed.goals.filter((g) => g.status === "active")).toHaveLength(1);
    const achieved = seed.goals.find((g) => g.status === "achieved");
    expect(achieved?.achievedAt).toBeTruthy();
    expect(seed.goals.find((g) => g.status === "active")?.achievedAt).toBeNull();
  });
});
