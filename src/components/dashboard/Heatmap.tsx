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


// A cross drawn after `design/x-inspo.jpg`: two long blades crossing, each
// swelling past its middle and closing to a point at both ends.
//
// NOT A STROKED LINE, AND IT CANNOT BE. An SVG stroke ends flat, flat with an
// overhang, or rounded, so no cap setting produces a point; lucide's X was
// tried at round and at square and read blunt both times. Each arm is a filled
// polygon instead, with its two tips on the arm's own endpoints.
//
// THE REFERENCE'S BRUSH TEXTURE IS DELIBERATELY NOT REPRODUCED, and this is the
// honest part. That artwork carries its streaks and broken edges at several
// hundred pixels; this renders at 20, where one unit of the 24 wide box is
// under a pixel, so a notch fine enough to read as texture there is smaller
// than a pixel here and would only turn the shape to mush. What survives at
// this size is the silhouette, so that is what was taken: long arms reaching
// most of the cell, an asymmetric swell rather than a symmetric diamond, and
// four fine points.
//
// The two side profiles differ on purpose, which is what keeps it from reading
// as a machined lozenge. Points are generated from those profiles rather than
// hand placed; the profiles are in the commit that added them.
function PointedCross() {
  return (
    <svg
      data-x
      width={20}
      height={20}
      viewBox="0 0 24 24"
      aria-hidden
      // Full strength rather than the dim token. It was dim so it would not
      // compete with the accent on a trained day, and on a real screen it
      // simply read as faint.
      style={{ color: "var(--text)" }}
    >
      <polygon
        points="3.20,2.80 7.22,9.53 11.36,14.37 16.41,18.35 20.80,21.20 17.48,15.56 13.48,10.58 8.54,6.50"
        fill="currentColor"
      />
      <polygon
        points="20.80,2.80 14.26,7.11 9.60,11.47 5.85,16.69 3.20,21.20 8.68,17.64 13.48,13.42 17.34,8.30"
        fill="currentColor"
      />
    </svg>
  );
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
                data-day-number
                className="absolute leading-none"
                style={{
                  top: 3,
                  right: 4,
                  // The same face as the hero number above this grid, so the
                  // two read as one card rather than as two typefaces.
                  fontFamily: "var(--font-spectral)",
                  // 9px was present without being readable; 13.5 crowded the
                  // cell against the cross. 12 is the setting that survived
                  // both device passes.
                  fontSize: 12,
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
                  size={15}
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
                <PointedCross />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
