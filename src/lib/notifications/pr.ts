import "server-only";
import { createClient } from "@/lib/supabase/server";
import { estimatedOneRepMax } from "@/lib/progress/strength";
import { sendToUser } from "@/lib/notifications/push";
import { prCelebrationPayload } from "@/lib/notifications/payloads";
import { shouldSendPr } from "@/lib/notifications/gate";

export async function celebrateIfPr(
  exerciseId: string,
  reps: number,
  weight: number,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("notif_master, notif_pr")
    .maybeSingle();
  if (!settings || !shouldSendPr(settings)) return;

  // All of this user's sets for the exercise (RLS-scoped), including the one
  // just inserted. It is a PR when the new set is the unique estimated-1RM best
  // and there was at least one prior set to beat.
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight")
    .eq("exercise_id", exerciseId);
  const all = (sets ?? []) as { reps: number; weight: number }[];
  if (all.length < 2) return;

  const current = estimatedOneRepMax(weight, reps);
  const atOrAbove = all.filter(
    (x) => estimatedOneRepMax(x.weight, x.reps) >= current - 1e-9,
  ).length;
  if (atOrAbove !== 1) return;

  const { data: ex } = await supabase
    .from("exercises")
    .select("name")
    .eq("id", exerciseId)
    .maybeSingle();
  const name = (ex as { name: string } | null)?.name ?? "Exercise";

  await sendToUser(user.id, prCelebrationPayload(name, weight, reps));
}
