import { estimatedOneRepMax } from "@/lib/progress/strength";

export type PrInput = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  loggedAt: string;
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
  loggedAt: string;
};

export function detectPrs(sets: PrInput[]): PersonalRecord[] {
  const sorted = [...sets].sort((a, b) =>
    a.loggedAt < b.loggedAt ? -1 : a.loggedAt > b.loggedAt ? 1 : 0,
  );
  const best = new Map<string, number>();
  const prs: PersonalRecord[] = [];
  for (const s of sorted) {
    const e1rm = estimatedOneRepMax(s.weight, s.reps);
    const prior = best.get(s.exerciseId);
    if (prior === undefined) {
      best.set(s.exerciseId, e1rm);
      continue;
    }
    if (e1rm > prior) {
      best.set(s.exerciseId, e1rm);
      prs.push({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        weight: s.weight,
        reps: s.reps,
        e1rm,
        loggedAt: s.loggedAt,
      });
    }
  }
  return prs;
}
