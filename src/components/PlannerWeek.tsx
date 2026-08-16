import type { PlannerDay } from "@/lib/planner/week";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// The day number is read out of the key rather than parsed into a Date.
// new Date("2026-08-10") is UTC midnight, so in any negative offset zone it
// renders as the 9th, and this app resolves every date in America/Chicago. The
// key is already the answer; parsing it can only lose.
function dayNumber(key: string): string {
  return String(Number(key.slice(8, 10)));
}

export function PlannerWeek({
  week,
  days,
  categoryNames,
  onPick,
}: {
  week: string[];
  days: PlannerDay[];
  categoryNames: Record<string, string>;
  onPick: (day: string) => void;
}) {
  return (
    <div
      className="flex justify-center gap-1.5 mt-4"
      role="group"
      aria-label="This week"
    >
      {week.map((day, i) => {
        const entry = days.find((d) => d.day === day);
        const labels = (entry?.categories ?? [])
          .map((id) => categoryNames[id])
          .filter((n): n is string => Boolean(n));
        // A day with no row is neither planned nor done, so it reads false the
        // same way a finished day does. The two are told apart by their labels,
        // not by this attribute.
        const planned = entry !== undefined && !entry.done;
        const done = entry !== undefined && entry.done;

        // Two of the seven visible letters repeat, so the letter alone cannot
        // identify a button. The state is spelled out rather than left to the
        // border style, which a screen reader cannot see at all.
        const name = [
          `${WEEKDAYS[i]} ${dayNumber(day)}`,
          labels.length > 0 ? labels.join(", ") : "nothing planned",
          done ? "done" : planned ? "planned" : null,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <button
            key={day}
            type="button"
            data-testid={`planner-day-${day}`}
            data-planned={String(planned)}
            aria-label={name}
            onClick={() => onPick(day)}
            className="flex flex-col items-center justify-start flex-1 gap-1 px-0.5 py-1.5 border"
            style={{
              // 44 is the floor SPEC.md sets for a touch target, and these are
              // the smallest controls on the dashboard.
              minHeight: 44,
              minWidth: 0,
              borderRadius: "var(--radius-square)",
              background: done ? "var(--accent-dim)" : "var(--surface)",
              // Planned is a dashed edge rather than a lighter colour, so the
              // difference survives greyscale and low vision, and the state is
              // in the accessible name regardless.
              borderStyle: planned ? "dashed" : "solid",
              borderColor: planned ? "var(--accent)" : "var(--surface-border)",
              color: "var(--text)",
            }}
          >
            <span className="text-[9px]" style={{ color: "var(--text-dim)" }} aria-hidden>
              {LETTERS[i]}
            </span>
            <span
              className="text-[8.5px] leading-tight text-center break-words"
              style={{ color: done ? "var(--accent)" : "var(--text-dim)" }}
              aria-hidden
            >
              {labels.join(", ")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
