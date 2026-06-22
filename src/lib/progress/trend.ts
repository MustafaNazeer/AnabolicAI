export type TrendDirection = "up" | "flat" | "down";

function slope(values: number[]): number {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function trendDirection(values: number[]): TrendDirection {
  const recent = values.slice(-4);
  if (recent.length < 2) return "flat";
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const threshold = Math.max(0.5, avg * 0.01);
  const s = slope(recent);
  if (s > threshold) return "up";
  if (s < -threshold) return "down";
  return "flat";
}

export function trendLabel(dir: TrendDirection): string {
  if (dir === "up") return "Improving";
  if (dir === "down") return "Trending down";
  return "Holding steady";
}
