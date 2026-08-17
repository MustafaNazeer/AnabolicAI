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


// A five pointed star with points sharp enough to read at this size.
//
// SHARPNESS IS THE INNER RADIUS OVER THE OUTER ONE, and nothing else. Lucide's
// Star sits near 0.5, which is a fine shape at 40px and reads stubby at this
// one, so this uses 0.36: the same five points, drawn narrower, so each comes
// to an actual spike rather than a wedge. Filled and unstroked, since a stroke
// would round the tips back off and undo the whole point.
//
// Generated from the ratio rather than hand placed, on the same reasoning as
// the cross below it.
function PointedStar() {
  return (
    <svg data-star width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <polygon
        points="12.00,1.00 14.33,8.80 22.46,8.60 15.77,13.22 18.47,20.90 12.00,15.96 5.53,20.90 8.23,13.22 1.54,8.60 9.67,8.80"
        fill="currentColor"
      />
    </svg>
  );
}

// The mark on a day already gone: one blade running from the top right corner
// to the bottom left, drawn after `design/x-inspo.jpg`.
//
// ONE STROKE, NOT A CROSS, AND THE DIRECTION IS LOAD BEARING. The cross was two
// blades and its top right tip landed on the day number. Rather than shrink the
// mark, the number moved to the top left and the second arm went; a line
// running top right to bottom left never passes through the corner the number
// now occupies. Drawn the other way it would cut straight through it, so the
// direction is asserted in the tests rather than left to whoever edits next.
//
// NOT A STROKED LINE, AND IT CANNOT BE. An SVG stroke ends flat, flat with an
// overhang, or rounded, so no cap setting produces a point. This is a filled
// polygon whose two tips are the line's own endpoints.
//
// THE REFERENCE'S BRUSH TEXTURE IS DELIBERATELY NOT REPRODUCED, and this is the
// honest part. That artwork carries its streaks at several hundred pixels; this
// renders at 24, where a notch fine enough to read as texture there is under a
// pixel here and would only turn the shape to mush. What survives at this size
// is the silhouette, so that is what was taken: a long blade reaching most of
// the cell, an asymmetric swell rather than a symmetric lozenge, and two fine
// points. The two side profiles differ on purpose, which is what keeps it from
// reading as machined; the points are generated from those profiles rather than
// hand placed.
function PointedSlash() {
  return (
    <svg
      data-struck
      width={24}
      height={24}
      viewBox="0 0 24 24"
      aria-hidden
      // Full strength rather than the dim token. It was dim so it would not
      // compete with the accent on a trained day, and on a real screen it
      // simply read as faint.
      style={{ color: "var(--text)" }}
    >
      <polygon
        points="20.80,2.80 14.66,7.50 10.09,11.93 6.13,16.96 3.20,21.20 8.34,17.31 13.01,12.96 17.04,8.01"
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
                  left: 4,
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
                <span aria-hidden style={{ color: "var(--accent)", lineHeight: 0 }}>
                  <PointedStar />
                </span>
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
                <PointedSlash />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
