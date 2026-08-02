"use client";

import {
  ResponsiveContainer,
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
import type { RoutineVolumePoint } from "@/lib/progress/types";

// Separated from the legend deliberately. The legend is content a screen reader
// needs and two test files query synchronously, so it stays in the wrapper and
// renders immediately. Only the drawing is deferred.
export default function RoutineVolumeCanvas({
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
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            stroke="var(--surface-border)"
          />
          <YAxis
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            stroke="var(--surface-border)"
            width={40}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--surface-border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
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
