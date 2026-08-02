"use client";

// Both chart canvases live in one module ON PURPOSE, and splitting them back
// out will silently cost more than it looks.
//
// These were two files at first. Because next/dynamic creates a chunk per
// import specifier, that gave Recharts its own 334 KB copy in each of the two
// chunks, and /progress renders both charts, so the browser downloaded and
// PARSED the library twice. Parsing it twice off the critical path is worse for
// blocking time than parsing it once on it, which is the opposite of the point.
// One module means one chunk means one copy.
//
// This is also the only place in the app that references Recharts, which is
// what keeps it out of every route's initial bundle.

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { colorForIndex } from "@/lib/progress/palette";
import { shortDate } from "@/lib/progress/format";
import { formatCompact } from "@/lib/progress/strength";
import type { ProgressPoint, RoutineVolumePoint } from "@/lib/progress/types";

export type MetricKey = "maxWeight" | "e1rm" | "volume" | "topSetReps";

const TOOLTIP_STYLE = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: 8,
  color: "var(--text)",
} as const;

const AXIS_TICK = { fill: "var(--text-dim)", fontSize: 11 } as const;

export function ProgressChartCanvas({
  data,
  dataKey,
  unit,
}: {
  data: (ProgressPoint & { label: string })[];
  dataKey: MetricKey;
  unit: "lbs" | "reps";
}) {
  const format = (value: number) =>
    unit === "reps" ? `${value} reps` : `${formatCompact(value)} lbs`;
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--surface-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            stroke="var(--surface-border)"
          />
          <YAxis
            tick={AXIS_TICK}
            stroke="var(--surface-border)"
            width={40}
            tickFormatter={(v) =>
              unit === "reps" ? `${v}` : formatCompact(Number(v))
            }
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--text-dim)" }}
            formatter={(value) => [format(Number(value)), ""]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RoutineVolumeCanvas({
  exercises,
  points,
}: {
  exercises: { id: string; name: string }[];
  points: RoutineVolumePoint[];
}) {
  const rows = points.map((p) => {
    const row: Record<string, number | string> = {
      label: shortDate(p.date),
      total: p.total,
    };
    for (const ex of exercises) row[ex.id] = p.byExercise[ex.id] ?? 0;
    return row;
  });

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--surface-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            stroke="var(--surface-border)"
          />
          <YAxis
            tick={AXIS_TICK}
            stroke="var(--surface-border)"
            width={40}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--text-dim)" }}
            formatter={(value, name) => [`${formatCompact(Number(value))} lbs`, name]}
            labelFormatter={(label, payload) => {
              const total =
                Array.isArray(payload) && payload.length
                  ? Number(
                      (payload[0] as { payload?: { total?: number } }).payload?.total ?? 0,
                    )
                  : 0;
              return `${label}, ${formatCompact(total)} lbs total`;
            }}
          />
          {exercises.map((ex, i) => (
            <Bar
              key={ex.id}
              dataKey={ex.id}
              name={ex.name}
              stackId="volume"
              fill={colorForIndex(i)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
