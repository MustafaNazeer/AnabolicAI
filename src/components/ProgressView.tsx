"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendIndicator } from "@/components/TrendIndicator";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useProgressMetric } from "@/components/useProgressMetric";
import { shortDate } from "@/lib/progress/format";
import {
  PROGRESS_METRICS,
  type ProgressMetric,
} from "@/lib/progress/progressMetric";
import { RoutineVolumeChart } from "@/components/RoutineVolumeChart";
import { GoalCard } from "@/components/GoalCard";
import type { ProgressData, ProgressPoint, RoutineVolumeData } from "@/lib/progress/types";
import type { GoalWithProgress } from "@/lib/goals/types";
import type { MetricKey } from "@/components/ProgressChartCanvas";

// Loaded after hydration so Recharts, 105 KB gzipped, stays off the initial
// bundle. ssr: false because the chart is decoration over data the page has
// already stated in words, and the skeleton holds its exact height so nothing
// below it shifts when the chart arrives.
const ProgressChartCanvas = dynamic(
  () => import("@/components/ProgressChartCanvas"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full" style={{ height: 200 }} />,
  },
);

const METRIC_CONFIG: Record<
  ProgressMetric,
  {
    label: string;
    title: string;
    dataKey: MetricKey;
    unit: "lbs" | "reps";
    select: (p: ProgressPoint) => number;
  }
> = {
  weight: {
    label: "Weight",
    title: "Weight over time",
    dataKey: "maxWeight",
    unit: "lbs",
    select: (p) => p.maxWeight,
  },
  e1rm: {
    label: "Est. 1RM",
    title: "Estimated max you could lift once",
    dataKey: "e1rm",
    unit: "lbs",
    select: (p) => p.e1rm,
  },
  volume: {
    label: "Volume",
    title: "Total weight moved per session",
    dataKey: "volume",
    unit: "lbs",
    select: (p) => p.volume,
  },
  reps: {
    label: "Reps",
    title: "Reps on your heaviest set",
    dataKey: "topSetReps",
    unit: "reps",
    select: (p) => p.topSetReps,
  },
};

export function ProgressView({
  data,
  routineVolume,
  goals,
}: {
  data: ProgressData;
  routineVolume: RoutineVolumeData;
  goals: Record<string, { active: GoalWithProgress | null; achieved: GoalWithProgress[] }>
}) {
  const [selected, setSelected] = useState(data.exercises[0]?.id ?? "");
  const { metric, setMetric } = useProgressMetric();
  const [routineId, setRoutineId] = useState(
    routineVolume.routines[0]?.id ?? "",
  );

  if (data.exercises.length === 0) {
    return (
      <p style={{ color: "var(--text-dim)" }}>
        Log a few workouts and your charts will appear here.
      </p>
    );
  }

  const points: ProgressPoint[] = data.series[selected] ?? [];
  const chartData = points.map((p) => ({ ...p, label: shortDate(p.date) }));
  const config = METRIC_CONFIG[metric];
  const trendValues = points.map(config.select);

  const routine = routineVolume.series[routineId];
  const routineTrend = routine ? routine.points.map((p) => p.total) : [];

  return (
    <div className="flex flex-col gap-8">
      <label className="text-xs" style={{ color: "var(--text-dim)" }}>
        Exercise
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2 mt-1"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-square)",
            color: "var(--text)",
            minHeight: 44,
          }}
        >
          {data.exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </label>

      <SegmentedControl<ProgressMetric>
        label="Metric"
        value={metric}
        onChange={setMetric}
        options={PROGRESS_METRICS.map((m) => ({
          value: m,
          label: METRIC_CONFIG[m].label,
        }))}
      />

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{config.title}</h2>
          <TrendIndicator values={trendValues} />
        </div>
        <ProgressChartCanvas
          data={chartData}
          dataKey={config.dataKey}
          unit={config.unit}
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Volume by exercise</h2>
          {routine && <TrendIndicator values={routineTrend} />}
        </div>

        {routineVolume.routines.length === 0 ? (
          <p style={{ color: "var(--text-dim)" }}>
            Complete a routine and its volume breakdown will appear here.
          </p>
        ) : (
          <>
            <label className="text-xs block mb-4" style={{ color: "var(--text-dim)" }}>
              Routine
              <select
                value={routineId}
                onChange={(e) => setRoutineId(e.target.value)}
                className="w-full px-3 py-2 mt-1"
                style={{
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "var(--radius-square)",
                  color: "var(--text)",
                  minHeight: 44,
                }}
              >
                {routineVolume.routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            {routine && (
              <RoutineVolumeChart
                exercises={routine.exercises}
                points={routine.points}
              />
            )}
          </>
        )}
      </section>

      <GoalCard
        key={selected}
        exerciseId={selected}
        active={goals[selected]?.active ?? null}
        achieved={goals[selected]?.achieved ?? []}
      />
    </div>
  );
}
