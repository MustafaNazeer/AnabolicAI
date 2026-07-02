import { setVolume } from "@/lib/progress/strength";

export type SetInput = { weight: number; reps: number };

export function exerciseVolume(sets: SetInput[]): number {
  return sets.reduce((total, s) => total + setVolume(s.weight, s.reps), 0);
}

export function topSetReps(sets: SetInput[]): number {
  if (sets.length === 0) return 0;
  const maxWeight = Math.max(...sets.map((s) => s.weight));
  const atTop = sets.filter((s) => s.weight === maxWeight);
  return Math.max(...atTop.map((s) => s.reps));
}
