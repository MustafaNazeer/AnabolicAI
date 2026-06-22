import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trendDirection, trendLabel } from "@/lib/progress/trend";

export function TrendIndicator({ values }: { values: number[] }) {
  const dir = trendDirection(values);
  const color =
    dir === "up"
      ? "var(--trend-up)"
      : dir === "down"
        ? "var(--trend-down)"
        : "var(--trend-flat)";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-medium"
      style={{ color }}
    >
      <Icon size={16} aria-hidden />
      {trendLabel(dir)}
    </span>
  );
}
