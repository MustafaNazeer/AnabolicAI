import { describe, it, expect } from "vitest";
import { planDemoWrite } from "@/lib/demo/plan";
import { buildDemoSeed } from "@/lib/demo/seed";

const NOW = new Date("2026-08-01T14:00:00.000Z");
const USER = "demo-user-id";

function counter() {
  let n = 0;
  return () => `id-${++n}`;
}

function allNames(seed: ReturnType<typeof buildDemoSeed>): string[] {
  const names = new Set<string>();
  for (const r of seed.routines) {
    for (const e of r.exercises) names.add(e.name);
    for (const s of r.sessions) for (const set of s.sets) names.add(set.exerciseName);
  }
  for (const g of seed.goals) names.add(g.exerciseName);
  return [...names];
}

function idMap(seed: ReturnType<typeof buildDemoSeed>): Map<string, string> {
  return new Map(allNames(seed).map((n, i) => [n, `ex-${i}`]));
}

describe("planDemoWrite", () => {
  it("emits one routine row per routine, owned by the user", () => {
    const seed = buildDemoSeed(NOW);
    const w = planDemoWrite(seed, idMap(seed), USER, counter());
    expect(w.routines).toHaveLength(3);
    for (const r of w.routines) expect(r.user_id).toBe(USER);
    expect(w.routines.map((r) => r.name)).toEqual(["Push Day", "Pull Day", "Leg Day"]);
  });

  it("links routine exercises to their routine with a stable order", () => {
    const seed = buildDemoSeed(NOW);
    const w = planDemoWrite(seed, idMap(seed), USER, counter());
    expect(w.routine_exercises).toHaveLength(12);
    const routineIds = new Set(w.routines.map((r) => r.id));
    for (const re of w.routine_exercises) expect(routineIds.has(re.routine_id)).toBe(true);
    const first = w.routine_exercises.filter((re) => re.routine_id === w.routines[0].id);
    expect(first.map((re) => re.order_index)).toEqual([0, 1, 2, 3]);
  });

  it("links every set to a session that exists", () => {
    const seed = buildDemoSeed(NOW);
    const w = planDemoWrite(seed, idMap(seed), USER, counter());
    expect(w.workout_sessions).toHaveLength(24);
    const sessionIds = new Set(w.workout_sessions.map((s) => s.id));
    expect(w.workout_sets.length).toBeGreaterThan(0);
    for (const s of w.workout_sets) expect(sessionIds.has(s.session_id)).toBe(true);
  });

  it("resolves every exercise name to an id", () => {
    const seed = buildDemoSeed(NOW);
    const w = planDemoWrite(seed, idMap(seed), USER, counter());
    for (const s of w.workout_sets) expect(s.exercise_id).toMatch(/^ex-/);
    for (const g of w.goals) expect(g.exercise_id).toMatch(/^ex-/);
  });

  it("carries the reps in reserve pair through unchanged", () => {
    const seed = buildDemoSeed(NOW);
    const w = planDemoWrite(seed, idMap(seed), USER, counter());
    for (const s of w.workout_sets) {
      expect(s.rir_low === null).toBe(s.rir_high === null);
    }
    expect(w.workout_sets.some((s) => s.rir_low === null)).toBe(true);
    expect(w.workout_sets.some((s) => s.rir_low !== null)).toBe(true);
  });

  it("gives every row a distinct id", () => {
    const seed = buildDemoSeed(NOW);
    const w = planDemoWrite(seed, idMap(seed), USER, counter());
    const ids = [
      ...w.routines,
      ...w.routine_exercises,
      ...w.workout_sessions,
      ...w.workout_sets,
      ...w.goals,
    ].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // An unknown name means the seed and the default library have diverged. That
  // must be loud, because the alternative is a silent half written demo.
  it("throws when an exercise name is not in the library", () => {
    const seed = buildDemoSeed(NOW);
    const partial = idMap(seed);
    partial.delete("Bench Press");
    expect(() => planDemoWrite(seed, partial, USER, counter())).toThrow(/Bench Press/);
  });
});
