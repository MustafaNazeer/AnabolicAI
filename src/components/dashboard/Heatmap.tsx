import {
  cellIntensity,
  maxVolume,
  type MatrixDay,
  type MatrixMetric,
} from "@/lib/progress/matrix";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function Heatmap({
  days,
  metric,
}: {
  days: MatrixDay[];
  metric: MatrixMetric;
}) {
  const max = maxVolume(days);
  return (
    <div>
      <div
        className="grid grid-cols-7 gap-[5px] mb-[5px] text-center"
        style={{ fontSize: 8, color: "var(--text-dim)" }}
      >
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[5px]">
        {days.map((day) => {
          const intensity = cellIntensity(day, metric, max);
          const on = intensity > 0;
          return (
            <span
              key={day.dateKey}
              data-cell={day.dateKey}
              data-on={on ? "1" : "0"}
              style={{
                aspectRatio: "1",
                borderRadius: 4,
                background: on
                  ? `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`
                  : "rgba(255,255,255,0.07)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
