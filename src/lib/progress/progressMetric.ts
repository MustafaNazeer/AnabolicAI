export type ProgressMetric = "weight" | "e1rm" | "volume" | "reps";

export const PROGRESS_METRICS: ProgressMetric[] = [
  "weight",
  "e1rm",
  "volume",
  "reps",
];
export const DEFAULT_PROGRESS_METRIC: ProgressMetric = "weight";

export function resolveProgressMetric(
  value: string | null | undefined,
): ProgressMetric {
  return (PROGRESS_METRICS as string[]).includes(value ?? "")
    ? (value as ProgressMetric)
    : DEFAULT_PROGRESS_METRIC;
}
