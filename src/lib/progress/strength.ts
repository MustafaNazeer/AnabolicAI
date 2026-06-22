export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(weight: number, reps: number): number {
  return weight * reps;
}

export function formatCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  return `${Math.round(n)}`;
}
