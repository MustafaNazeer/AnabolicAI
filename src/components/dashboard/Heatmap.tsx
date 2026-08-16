import { Star } from "lucide-react";
import {
  cellIntensity,
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

function monthOf(key: string): string {
  return key.slice(0, 7);
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
  // ONE MONTH IS NUMBERED, NOT BOTH. The window is five weeks ending on the
  // current week's Sunday, so it always runs back into the month before it.
  // Numbering that one too puts a second 1 through 31 in the same grid with
  // nothing to say which month a number belongs to.
  //
  // Taken from today when it is known, because on the 31st the window can end
  // in the following month while the month being read is still this one. The
  // last cell is the fallback for a caller that passes no today at all.
  const shownMonth = today
    ? monthOf(today)
    : monthOf(days[days.length - 1]?.dateKey ?? "");

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
          const numbered = monthOf(day.dateKey) === shownMonth;
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
              {numbered ? (
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
                    // dimmed number on a faint tile is the same mistake that
                    // made a planned day's label invisible on a real phone; the
                    // tile's colour already carries the intensity.
                    color: "var(--text)",
                  }}
                >
                  {dayNumber(day.dateKey)}
                </span>
              ) : null}
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
