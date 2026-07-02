import { createClient } from "@/lib/supabase/server";
import { estimatedOneRepMax, setVolume } from "@/lib/progress/strength";
import { currentStreakWeeks, isInCurrentWeek } from "@/lib/progress/week";
import { detectPrs, type PrInput } from "@/lib/progress/prs";
import { APP_TIMEZONE } from "@/lib/notifications/schedule";
import { buildMatrix, type MatrixDay } from "@/lib/progress/matrix";
import { exerciseVolume, topSetReps } from "@/lib/progress/exerciseMetrics";
import type {
  DashboardData,
  ProgressData,
  ProgressPoint,
  RecentWorkout,
  WeeklySummary,
} from "@/lib/progress/types";

type RawSet = {
  exercise_id: string;
  reps: number;
  weight: number;
  logged_at: string;
  exercise: { id: string; name: string } | null;
};

type RawSession = {
  id: string;
  completed_at: string | null;
  routines: { name: string } | null;
  workout_sets: RawSet[] | null;
};

async function getCompletedSessions(): Promise<RawSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      "id, completed_at, routines(name), workout_sets(exercise_id, reps, weight, logged_at, exercise:exercises(id, name))",
    )
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });
  return (data ?? []) as unknown as RawSession[];
}

export async function getDashboardData(
  now: Date = new Date(),
): Promise<DashboardData> {
  const sessions = await getCompletedSessions();

  const thisWeek = sessions.filter(
    (s) => s.completed_at && isInCurrentWeek(new Date(s.completed_at), now),
  );
  let weeklySets = 0;
  let weeklyVolume = 0;
  for (const s of thisWeek) {
    const sets = s.workout_sets ?? [];
    weeklySets += sets.length;
    for (const st of sets) weeklyVolume += setVolume(st.weight, st.reps);
  }
  const weekly: WeeklySummary = {
    workouts: thisWeek.length,
    sets: weeklySets,
    volume: weeklyVolume,
  };

  const streakWeeks = currentStreakWeeks(
    sessions
      .filter((s) => s.completed_at)
      .map((s) => new Date(s.completed_at as string)),
    now,
  );

  const recent: RecentWorkout[] = sessions.slice(0, 5).map((s) => {
    const sets = s.workout_sets ?? [];
    return {
      id: s.id,
      routineName: s.routines?.name ?? "Workout",
      completedAt: s.completed_at as string,
      sets: sets.length,
      volume: sets.reduce((a, st) => a + setVolume(st.weight, st.reps), 0),
    };
  });

  const allSets: PrInput[] = [];
  for (const s of sessions) {
    for (const st of s.workout_sets ?? []) {
      allSets.push({
        exerciseId: st.exercise_id,
        exerciseName: st.exercise?.name ?? "Exercise",
        weight: st.weight,
        reps: st.reps,
        loggedAt: st.logged_at,
      });
    }
  }
  const prs = detectPrs(allSets)
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))
    .slice(0, 5);

  return { weekly, streakWeeks, recent, prs };
}

export async function getProgressData(): Promise<ProgressData> {
  const sessions = await getCompletedSessions();
  // Oldest first so each exercise series reads left to right in time.
  const ordered = [...sessions].reverse();

  const series: Record<string, ProgressPoint[]> = {};
  const names: Record<string, string> = {};

  for (const s of ordered) {
    if (!s.completed_at) continue;
    const byExercise = new Map<string, RawSet[]>();
    for (const st of s.workout_sets ?? []) {
      names[st.exercise_id] = st.exercise?.name ?? "Exercise";
      const arr = byExercise.get(st.exercise_id) ?? [];
      arr.push(st);
      byExercise.set(st.exercise_id, arr);
    }
    for (const [exId, sets] of byExercise) {
      const maxWeight = Math.max(...sets.map((x) => x.weight));
      const e1rm = Math.max(
        ...sets.map((x) => estimatedOneRepMax(x.weight, x.reps)),
      );
      (series[exId] ??= []).push({
        sessionId: s.id,
        date: s.completed_at,
        maxWeight,
        e1rm: Math.round(e1rm),
        volume: exerciseVolume(sets),
        topSetReps: topSetReps(sets),
      });
    }
  }

  const exercises = Object.keys(series).map((id) => ({ id, name: names[id] }));
  exercises.sort((a, b) => {
    const la = series[a.id].at(-1)?.date ?? "";
    const lb = series[b.id].at(-1)?.date ?? "";
    return la < lb ? 1 : -1;
  });

  return { exercises, series };
}

export async function getMatrixData(
  now: Date = new Date(),
): Promise<MatrixDay[]> {
  const sessions = await getCompletedSessions();

  const sessionInputs = sessions
    .filter((s) => s.completed_at)
    .map((s) => ({ completedAt: s.completed_at as string }));

  const setInputs: { weight: number; reps: number; loggedAt: string }[] = [];
  const allSets: PrInput[] = [];
  for (const s of sessions) {
    for (const st of s.workout_sets ?? []) {
      setInputs.push({ weight: st.weight, reps: st.reps, loggedAt: st.logged_at });
      allSets.push({
        exerciseId: st.exercise_id,
        exerciseName: st.exercise?.name ?? "Exercise",
        weight: st.weight,
        reps: st.reps,
        loggedAt: st.logged_at,
      });
    }
  }
  const prDates = detectPrs(allSets).map((p) => p.loggedAt);

  return buildMatrix(
    { sessions: sessionInputs, sets: setInputs, prDates },
    now,
    APP_TIMEZONE,
  );
}
