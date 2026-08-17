import { Star } from "lucide-react";
import {
  cellIntensity,
  leadingBlanks,
  maxVolume,
  type MatrixDay,
  type MatrixMetric,
} from "@/lib/progress/matrix";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// The day number is read out of the key rather than parsed into a Date.
// new Date("2026-08-01") is UTC midnight, so in any negative offset zone it
// renders as July 31st, and this app resolves every date in America/Chicago.
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
  // Optional, because the grid draws one month and today is not guaranteed to
  // be in the month being drawn. A key that matches nothing marks nothing.
  today?: string;
}) {
  const max = maxVolume(days);
  // A month rarely begins on a Monday, so the grid opens with empty places to
  // keep every column under its own weekday. They are gaps rather than squares:
  // no date, no background, nothing to read.
  const blanks = days.length > 0 ? leadingBlanks(days[0].dateKey) : 0;

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
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`blank-${i}`} data-blank="1" aria-hidden style={{ aspectRatio: "1" }} />
        ))}
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
              className="relative flex items-center justify-center"
              style={{
                aspectRatio: "1",
                borderRadius: 4,
                background: on
                  ? `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`
                  : "rgba(255,255,255,0.07)",
              }}
            >
              <span
                className="absolute leading-none"
                style={{
                  top: 3,
                  right: 4,
                  // The same face as the hero number above this grid, so the
                  // two read as one card rather than as two typefaces.
                  fontFamily: "var(--font-spectral)",
                  fontSize: 9,
                  // Full strength foreground rather than the dim token. A
                  // dimmed number on a faint tile is the same mistake that made
                  // a planned day's label invisible on a real phone; the tile's
                  // colour already carries the intensity.
                  color: "var(--text)",
                }}
              >
                {dayNumber(day.dateKey)}
              </span>
              {isToday ? (
                <Star size={11} aria-hidden style={{ color: "var(--accent)" }} />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
