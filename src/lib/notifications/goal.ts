import "server-only";
import { createClient } from "@/lib/supabase/server";
import { estimatedOneRepMax } from "@/lib/progress/strength";
import { sendToUser } from "@/lib/notifications/push";
import {
  goalReachedPayload,
  goalProximityPayload,
} from "@/lib/notifications/payloads";
import { shouldSendGoal } from "@/lib/notifications/gate";
import { decideGoalNotification } from "@/lib/goals/notify";

export async function evaluateGoalOnLog(exerciseId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("notif_master, notif_goal")
    .maybeSingle();
  if (!settings || !shouldSendGoal(settings)) return;

  const { data: goal } = await supabase
    .from("goals")
    .select("id, target_weight, target_reps, status, proximity_notified")
    .eq("exercise_id", exerciseId)
    .eq("status", "active")
    .maybeSingle();
  if (!goal) return;
  const g = goal as {
    id: string;
    target_weight: number;
    target_reps: number;
    status: "active" | "achieved";
    proximity_notified: boolean;
  };

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight")
    .eq("exercise_id", exerciseId);
  let best = 0;
  for (const s of (sets ?? []) as { reps: number; weight: number }[]) {
    const e = estimatedOneRepMax(s.weight, s.reps);
    if (e > best) best = e;
  }

  const decision = decideGoalNotification(
    {
      targetWeight: g.target_weight,
      targetReps: g.target_reps,
      status: g.status,
      proximityNotified: g.proximity_notified,
    },
    best,
  );
  if (decision.action === "none") return;

  const { data: ex } = await supabase
    .from("exercises")
    .select("name")
    .eq("id", exerciseId)
    .maybeSingle();
  const name = (ex as { name: string } | null)?.name ?? "Exercise";

  if (decision.action === "reached") {
    const { data: updated, error: updateError } = await supabase
      .from("goals")
      .update({ status: "achieved", achieved_at: new Date().toISOString() })
      .eq("id", g.id)
      .eq("status", "active")
      .select("id");
    if (updateError || !updated || updated.length === 0) return;
    await sendToUser(user.id, goalReachedPayload(name, g.target_weight, g.target_reps));
  } else {
    const { data: updated, error: updateError } = await supabase
      .from("goals")
      .update({ proximity_notified: true })
      .eq("id", g.id)
      .eq("proximity_notified", false)
      .select("id");
    if (updateError || !updated || updated.length === 0) return;
    await sendToUser(user.id, goalProximityPayload(name, decision.lbsToGo, g.target_reps));
  }
}
