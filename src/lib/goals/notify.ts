import {
  goalProgress,
  withinProximity,
  displayLbsToGo,
} from "@/lib/goals/progress";

export type GoalNotifyDecision =
  | { action: "reached" }
  | { action: "nudge"; lbsToGo: number }
  | { action: "none" };

export function decideGoalNotification(
  goal: {
    targetWeight: number;
    targetReps: number;
    status: "active" | "achieved";
    proximityNotified: boolean;
  },
  currentBestE1rm: number,
): GoalNotifyDecision {
  if (goal.status !== "active") return { action: "none" };
  const p = goalProgress(currentBestE1rm, goal.targetWeight, goal.targetReps);
  if (p.reached) return { action: "reached" };
  if (!goal.proximityNotified && withinProximity(p.lbsToGo)) {
    return { action: "nudge", lbsToGo: displayLbsToGo(p.lbsToGo) };
  }
  return { action: "none" };
}
