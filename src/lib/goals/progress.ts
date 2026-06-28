import { estimatedOneRepMax } from "@/lib/progress/strength";

export type GoalProgress = {
  pct: number;
  lbsToGo: number;
  reached: boolean;
};

const EPS = 1e-9;

export function goalTargetE1rm(targetWeight: number, targetReps: number): number {
  return estimatedOneRepMax(targetWeight, targetReps);
}

export function currentBestE1rm(
  sets: { weight: number; reps: number }[],
): number {
  let best = 0;
  for (const s of sets) {
    const e = estimatedOneRepMax(s.weight, s.reps);
    if (e > best) best = e;
  }
  return best;
}

// Invert Epley to express an e1rm as a weight at a given rep count.
function weightForE1rmAtReps(e1rm: number, reps: number): number {
  if (reps <= 1) return e1rm;
  return e1rm / (1 + reps / 30);
}

export function goalProgress(
  currentBest: number,
  targetWeight: number,
  targetReps: number,
): GoalProgress {
  const target = goalTargetE1rm(targetWeight, targetReps);
  const reached = currentBest >= target - EPS;
  const pct = target <= 0 ? 1 : Math.min(1, Math.max(0, currentBest / target));
  let lbsToGo = Math.max(
    0,
    targetWeight - weightForE1rmAtReps(currentBest, targetReps),
  );
  // Clean up floating-point noise when very close to 0
  if (lbsToGo < EPS) lbsToGo = 0;
  return { pct, lbsToGo, reached };
}

export function withinProximity(lbsToGo: number, threshold = 5): boolean {
  return lbsToGo > 0 && lbsToGo <= threshold;
}

export function displayLbsToGo(lbsToGo: number): number {
  if (lbsToGo <= 0) return 0;
  return Math.max(5, Math.round(lbsToGo / 5) * 5);
}
