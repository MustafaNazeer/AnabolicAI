"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendIndicator } from "@/components/TrendIndicator";
import type { ProgressData, ProgressPoint } from "@/lib/progress/types";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function Chart({
  data,
  dataKey,
}: {
  data: (ProgressPoint & { label: string })[];
  dataKey: "maxWeight" | "e1rm";
}) {
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            stroke="var(--border)"
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
            labelStyle={{ color: "var(--text-dim)" }}
            formatter={(value) => [`${value} lbs`, ""]}
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

export function ProgressView({ data }: { data: ProgressData }) {
  const [selected, setSelected] = useState(data.exercises[0]?.id ?? "");

  if (data.exercises.length === 0) {
    return (
      <p style={{ color: "var(--text-dim)" }}>
        Log a few workouts and your charts will appear here.
      </p>
    );
  }

  const points: ProgressPoint[] = data.series[selected] ?? [];
  const chartData = points.map((p) => ({ ...p, label: shortDate(p.date) }));
  const weights = points.map((p) => p.maxWeight);
  const e1rms = points.map((p) => p.e1rm);

  return (
    <div className="flex flex-col gap-8">
      <label className="text-xs" style={{ color: "var(--text-dim)" }}>
        Exercise
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-lg px-3 py-2 mt-1 outline-none"
          style={{ background: "var(--surface-2)", color: "var(--text)", minHeight: 44 }}
        >
          {data.exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </label>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Weight over time</h2>
          <TrendIndicator values={weights} />
        </div>
        <Chart data={chartData} dataKey="maxWeight" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Estimated max you could lift once</h2>
          <TrendIndicator values={e1rms} />
        </div>
        <Chart data={chartData} dataKey="e1rm" />
      </section>
    </div>
  );
}
