import { Star, X } from "lucide-react";
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
          // Plain string comparison, which is exact on YYYY-MM-DD and needs no
          // Date at all. `today` is always the real key rather than one only
          // passed when it falls inside the drawn month, so a month entirely
          // behind us crosses all of its days and shows no star.
          const isPast = today !== undefined && day.dateKey < today;
          return (
            <span
              key={day.dateKey}
              data-cell={day.dateKey}
              data-on={on ? "1" : "0"}
              data-today={isToday ? "1" : "0"}
              data-past={isPast ? "1" : "0"}
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
              {/*
                Today is starred and never crossed, or the one day being looked
                for would read as a day already gone. Filled rather than an
                outline, because an 11px outline star is mostly background.
              */}
              {isToday ? (
                <Star
                  size={11}
                  data-star
                  fill="currentColor"
                  aria-hidden
                  style={{ color: "var(--accent)" }}
                />
              ) : null}
              {/*
                THE CROSS IS AN OVERLAY, NOT A REPLACEMENT. A past day that was
                trained keeps the colour it earned and gets the cross on top, so
                the grid still shows the training it exists to show.
                `--text-dim` with a heavy stroke rather than `--text`: the shape
                carries the visibility at this size, so the mark reads without
                competing with the accent on the days that matter.

                `!isToday` IS DELIBERATELY REDUNDANT and was measured to be so:
                removing it fails no test, because the strict `<` above already
                excludes today. It is kept so the invariant "today is never
                crossed" is enforced here rather than resting entirely on the
                choice of comparison operator two lines up.
              */}
              {isPast && !isToday ? (
                <X
                  size={12}
                  strokeWidth={3}
                  data-x
                  aria-hidden
                  style={{ color: "var(--text-dim)" }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
