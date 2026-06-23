// src/components/dashboard/MatrixCard.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { useMatrixMetric } from "@/components/useMatrixMetric";
import {
  matrixHeroSummary,
  type MatrixDay,
  type MatrixMetric,
} from "@/lib/progress/matrix";

const OPTIONS: { value: MatrixMetric; label: string }[] = [
  { value: "gym", label: "Gym days" },
  { value: "volume", label: "Volume" },
  { value: "prs", label: "PRs" },
];

const LABELS: Record<MatrixMetric, string> = {
  gym: "Gym days this week",
  volume: "Volume this week",
  prs: "Records this week",
};

export function MatrixCard({ days }: { days: MatrixDay[] }) {
  const { metric, setMetric } = useMatrixMetric();
  const hero = matrixHeroSummary(days, metric);
  return (
    <Card className="mt-4 p-4">
      <div
        className="text-[10.5px] uppercase tracking-[.11em]"
        style={{ color: "var(--text-dim)" }}
      >
        {LABELS[metric]}
      </div>
      <div className="mt-3">
        <SegmentedControl label="Activity metric" options={OPTIONS} value={metric} onChange={setMetric} />
      </div>
      <div className="mt-3.5">
        <span
          className="text-[44px] font-bold leading-[.9]"
          style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
        >
          {hero.value}
        </span>
        <span
          className="ml-1.5 text-sm font-semibold"
          style={{ fontFamily: "var(--font-geist-sans)", color: "var(--text-dim)" }}
        >
          {hero.unit}
        </span>
      </div>
      <div
        className="mt-3.5 text-[9.5px] uppercase tracking-[.08em]"
        style={{ color: "var(--text-dim)" }}
      >
        {hero.caption}
      </div>
      <div className="mt-2">
        <Heatmap days={days} metric={metric} />
      </div>
    </Card>
  );
}
