import { setVolume } from "@/lib/progress/strength";
import type { RoutineVolumeData, RoutineVolumePoint } from "@/lib/progress/types";

export type RoutineSessionInput = {
  id: string;
  date: string;
  routineId: string;
  routineName: string;
  sets: {
    exerciseId: string;
    exerciseName: string;
    weight: number;
    reps: number;
  }[];
};

export function buildRoutineVolume(
  sessions: RoutineSessionInput[],
): RoutineVolumeData {
  const byRoutine = new Map<string, RoutineSessionInput[]>();
  const names = new Map<string, string>();
  for (const s of sessions) {
    names.set(s.routineId, s.routineName);
    const arr = byRoutine.get(s.routineId) ?? [];
    arr.push(s);
    byRoutine.set(s.routineId, arr);
  }

  const series: RoutineVolumeData["series"] = {};
  for (const [routineId, group] of byRoutine) {
    const ordered = [...group].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
    const exercises: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    const points: RoutineVolumePoint[] = [];
    for (const s of ordered) {
      const byExercise: Record<string, number> = {};
      let total = 0;
      for (const st of s.sets) {
        if (!seen.has(st.exerciseId)) {
          seen.add(st.exerciseId);
          exercises.push({ id: st.exerciseId, name: st.exerciseName });
        }
        const v = setVolume(st.weight, st.reps);
        byExercise[st.exerciseId] = (byExercise[st.exerciseId] ?? 0) + v;
        total += v;
      }
      points.push({ sessionId: s.id, date: s.date, total, byExercise });
    }
    series[routineId] = { exercises, points };
  }

  const routines = [...byRoutine.keys()]
    .map((id) => ({
      id,
      name: names.get(id) ?? "Workout",
      last: Math.max(
        ...(byRoutine.get(id) ?? []).map((s) => Date.parse(s.date) || 0),
      ),
    }))
    .sort((a, b) => b.last - a.last)
    .map(({ id, name }) => ({ id, name }));

  return { routines, series };
}
