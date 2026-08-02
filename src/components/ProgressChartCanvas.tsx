"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCompact } from "@/lib/progress/strength";
import type { ProgressPoint } from "@/lib/progress/types";

export type MetricKey = "maxWeight" | "e1rm" | "volume" | "topSetReps";

// Default exported so next/dynamic resolves it without a .then() wrapper. This
// module is the only place Recharts is referenced on this screen, which is what
// keeps the library out of the initial bundle.
export default function ProgressChartCanvas({
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
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            stroke="var(--surface-border)"
          />
          <YAxis
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            stroke="var(--surface-border)"
            width={40}
            tickFormatter={(v) =>
              unit === "reps" ? `${v}` : formatCompact(Number(v))
            }
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--surface-border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
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
