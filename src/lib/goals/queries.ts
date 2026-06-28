// src/lib/goals/queries.ts
import { createClient } from "@/lib/supabase/server";
import { estimatedOneRepMax } from "@/lib/progress/strength";
import { goalProgress } from "@/lib/goals/progress";
import type { GoalWithProgress } from "@/lib/goals/types";

const GOAL_COLUMNS =
  "id, exercise_id, target_weight, target_reps, status, created_at, achieved_at, exercise:exercises(name)";

type RawGoal = {
  id: string;
  exercise_id: string;
  target_weight: number;
  target_reps: number;
  status: "active" | "achieved";
  created_at: string;
  achieved_at: string | null;
  exercise: { name: string } | null;
};

type DB = Awaited<ReturnType<typeof createClient>>;

async function bestE1rmByExercise(supabase: DB): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("workout_sets")
    .select("exercise_id, reps, weight");
  const best = new Map<string, number>();
  for (const s of (data ?? []) as {
    exercise_id: string;
    reps: number;
    weight: number;
  }[]) {
    const e = estimatedOneRepMax(s.weight, s.reps);
    if (e > (best.get(s.exercise_id) ?? 0)) best.set(s.exercise_id, e);
  }
  return best;
}

function toWithProgress(g: RawGoal, best: number): GoalWithProgress {
  const p = goalProgress(best, g.target_weight, g.target_reps);
  return {
    id: g.id,
    exerciseId: g.exercise_id,
    exerciseName: g.exercise?.name ?? "Exercise",
    targetWeight: g.target_weight,
    targetReps: g.target_reps,
    status: g.status,
    createdAt: g.created_at,
    achievedAt: g.achieved_at,
    ...p,
  };
}

export async function getGoalsByExercise(): Promise<
  Record<string, { active: GoalWithProgress | null; achieved: GoalWithProgress[] }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as RawGoal[];
  const best = await bestE1rmByExercise(supabase);

  const out: Record<
    string,
    { active: GoalWithProgress | null; achieved: GoalWithProgress[] }
  > = {};
  for (const g of rows) {
    const wp = toWithProgress(g, best.get(g.exercise_id) ?? 0);
    const bucket = (out[g.exercise_id] ??= { active: null, achieved: [] });
    if (wp.status === "active") bucket.active = wp;
    else bucket.achieved.push(wp);
  }
  return out;
}

export async function getActiveGoalsSummary(): Promise<GoalWithProgress[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .eq("status", "active");
  const rows = (data ?? []) as unknown as RawGoal[];
  const best = await bestE1rmByExercise(supabase);
  return rows
    .map((g) => toWithProgress(g, best.get(g.exercise_id) ?? 0))
    .sort((a, b) => a.lbsToGo - b.lbsToGo);
}
