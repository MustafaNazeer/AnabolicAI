import { type MatrixMetric } from "@/lib/progress/matrix";

export const MATRIX_METRICS: MatrixMetric[] = ["gym", "volume", "prs"];
export const DEFAULT_METRIC: MatrixMetric = "gym";

export function resolveMetric(value: string | null | undefined): MatrixMetric {
  return (MATRIX_METRICS as string[]).includes(value ?? "")
    ? (value as MatrixMetric)
    : DEFAULT_METRIC;
}
