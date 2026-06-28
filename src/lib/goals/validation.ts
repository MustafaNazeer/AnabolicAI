export function validateGoalInput(
  targetWeight: number,
  targetReps: number,
): { error?: string } {
  if (!Number.isFinite(targetWeight) || targetWeight < 0) {
    return { error: "Weight cannot be negative." };
  }
  if (!Number.isInteger(targetReps) || targetReps < 1) {
    return { error: "Reps must be at least 1." };
  }
  return {};
}
