import { describe, it, expect } from "vitest";
import {
  buildRoutineVolume,
  type RoutineSessionInput,
} from "@/lib/progress/routineVolume";

function session(
  id: string,
  date: string,
  routineId: string,
  routineName: string,
  sets: { exerciseId: string; exerciseName: string; weight: number; reps: number }[],
): RoutineSessionInput {
  return { id, date, routineId, routineName, sets };
}

describe("buildRoutineVolume", () => {
  it("totals volume per session and splits it by exercise", () => {
    const out = buildRoutineVolume([
      session("s1", "2026-06-01", "r1", "Push", [
        { exerciseId: "bench", exerciseName: "Bench", weight: 100, reps: 5 },
        { exerciseId: "ohp", exerciseName: "OHP", weight: 60, reps: 5 },
      ]),
    ]);
    const point = out.series.r1.points[0];
    expect(point.total).toBe(800);
    expect(point.byExercise).toEqual({ bench: 500, ohp: 300 });
  });

  it("orders points oldest to newest regardless of input order", () => {
    const out = buildRoutineVolume([
      session("s2", "2026-06-08", "r1", "Push", [
        { exerciseId: "bench", exerciseName: "Bench", weight: 100, reps: 5 },
      ]),
      session("s1", "2026-06-01", "r1", "Push", [
        { exerciseId: "bench", exerciseName: "Bench", weight: 90, reps: 5 },
      ]),
    ]);
    expect(out.series.r1.points.map((p) => p.sessionId)).toEqual(["s1", "s2"]);
  });

  it("keeps a stable exercise order by first appearance oldest to newest", () => {
    const out = buildRoutineVolume([
      session("s1", "2026-06-01", "r1", "Push", [
        { exerciseId: "bench", exerciseName: "Bench", weight: 100, reps: 5 },
      ]),
      session("s2", "2026-06-08", "r1", "Push", [
        { exerciseId: "bench", exerciseName: "Bench", weight: 100, reps: 5 },
        { exerciseId: "ohp", exerciseName: "OHP", weight: 60, reps: 5 },
      ]),
    ]);
    expect(out.series.r1.exercises.map((e) => e.id)).toEqual(["bench", "ohp"]);
  });

  it("orders routines by their most recent session first", () => {
    const out = buildRoutineVolume([
      session("s1", "2026-06-01", "r1", "Push", [
        { exerciseId: "bench", exerciseName: "Bench", weight: 100, reps: 5 },
      ]),
      session("s2", "2026-06-10", "r2", "Legs", [
        { exerciseId: "squat", exerciseName: "Squat", weight: 200, reps: 5 },
      ]),
    ]);
    expect(out.routines.map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("returns empty structures for no sessions", () => {
    expect(buildRoutineVolume([])).toEqual({ routines: [], series: {} });
  });
});
