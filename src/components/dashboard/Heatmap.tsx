import { Star } from "lucide-react";
import {
  cellIntensity,
  maxVolume,
  type MatrixDay,
  type MatrixMetric,
} from "@/lib/progress/matrix";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// The day number is read out of the key rather than parsed into a Date.
// new Date("2026-05-01") is UTC midnight, so in any negative offset zone it
// renders as April 30th, and this app resolves every date in America/Chicago.
// Number() also drops the leading zero, so the first reads 1 rather than 01.
function dayNumber(key: string): string {
  return String(Number(key.slice(8, 10)));
}

export function Heatmap({
  days,
  metric,
  today,
}: {
  days: MatrixDay[];
  metric: MatrixMetric;
  // Optional, because the window is five weeks and today is not guaranteed to
  // be inside it. A key that matches nothing simply marks nothing.
  today?: string;
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
          const isToday = day.dateKey === today;
          return (
            <span
              key={day.dateKey}
              data-cell={day.dateKey}
              data-on={on ? "1" : "0"}
              data-today={isToday ? "1" : "0"}
              className="flex items-center justify-center"
              style={{
                aspectRatio: "1",
                borderRadius: 4,
                background: on
                  ? `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`
                  : "rgba(255,255,255,0.07)",
                // Full strength foreground rather than the dim token. A dimmed
                // number on a faint tile is the same mistake that made a
                // planned day's label invisible on a real phone; the tile's own
                // colour already carries the intensity, so the number does not
                // need to be quiet as well.
                color: "var(--text)",
                fontSize: 10,
                lineHeight: 1,
              }}
            >
              {isToday ? (
                <Star size={11} aria-hidden style={{ color: "var(--accent)" }} />
              ) : (
                dayNumber(day.dateKey)
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
