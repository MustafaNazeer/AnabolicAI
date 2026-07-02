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

export function RoutineVolumeChart({
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
    <div>
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
              formatter={(value) => [`${formatCompact(Number(value))} lbs`, ""]}
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
      <ul
        aria-label="Exercises"
        className="flex flex-wrap gap-x-4 gap-y-1 mt-3"
      >
        {exercises.map((ex, i) => (
          <li
            key={ex.id}
            className="inline-flex items-center gap-2 text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: colorForIndex(i),
              }}
            />
            {ex.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
