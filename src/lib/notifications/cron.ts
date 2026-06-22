import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { setVolume } from "@/lib/progress/strength";
import { isInCurrentWeek, currentStreakWeeks } from "@/lib/progress/week";

type Row = {
  completed_at: string | null;
  workout_sets: { reps: number; weight: number }[] | null;
};

export async function gatherUserSchedule(
  admin: SupabaseClient,
  userId: string,
  zoned: Date,
): Promise<{
  workoutsThisWeek: number;
  currentStreak: number;
  weeklyVolume: number;
}> {
  const { data } = await admin
    .from("workout_sessions")
    .select("completed_at, workout_sets(reps, weight)")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  const sessions = (data ?? []) as Row[];
  const dates = sessions.map((s) => new Date(s.completed_at as string));
  const thisWeek = sessions.filter((s) =>
    isInCurrentWeek(new Date(s.completed_at as string), zoned),
  );
  let weeklyVolume = 0;
  for (const s of thisWeek) {
    for (const st of s.workout_sets ?? [])
      weeklyVolume += setVolume(st.weight, st.reps);
  }
  return {
    workoutsThisWeek: thisWeek.length,
    currentStreak: currentStreakWeeks(dates, zoned),
    weeklyVolume,
  };
}
