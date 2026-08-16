import { Star } from "lucide-react";
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
// key is already the answer; parsing it can only lose. Number() also drops the
// leading zero, so the first of a month reads 1 rather than 01.
function dayNumber(key: string): string {
  return String(Number(key.slice(8, 10)));
}

// The week, Monday first, for every account.
//
// TWO MODES IN ONE COMPONENT, ON PURPOSE. Without `onPick` it is a read only
// summary of the week: which days were trained, and which one is today. With
// it, each day opens its planner sheet. A single component means one definition
// of what a week is and one place where a day's state is decided, rather than
// two strips drifting apart above the same calendar.
export function WeekStrip({
  week,
  today,
  workoutDays,
  days = [],
  categoryNames = {},
  onPick,
}: {
  week: string[];
  today: string;
  workoutDays: string[];
  days?: PlannerDay[];
  categoryNames?: Record<string, string>;
  onPick?: (day: string) => void;
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

        // A logged workout and a planner day marked done are the same claim
        // about the day, so either one makes it trained. They are separate
        // sources because one account logs sessions and another logs days.
        const trained = workoutDays.includes(day) || Boolean(entry?.done);
        const planned = entry !== undefined && !entry.done;
        const isToday = day === today;

        // Two of the seven letters repeat and a bare number says nothing about
        // state, so the whole day is spelled out. A screen reader gets the same
        // information the colours and the border carry.
        const name = [
          `${WEEKDAYS[i]} ${dayNumber(day)}`,
          isToday ? "today" : null,
          labels.length > 0 ? labels.join(", ") : null,
          trained ? "trained" : planned ? "planned" : null,
        ]
          .filter(Boolean)
          .join(", ");

        const content = (
          <>
            <span
              className="flex items-center justify-center"
              style={{ height: 11, color: "var(--accent)" }}
              aria-hidden
            >
              {isToday ? (
                <Star size={10} />
              ) : (
                <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>
                  {LETTERS[i]}
                </span>
              )}
            </span>
            <span
              className="text-[13px] font-semibold leading-none"
              style={{
                fontFamily: "var(--font-spectral)",
                color: trained ? "var(--accent)" : "var(--text)",
              }}
              aria-hidden
            >
              {dayNumber(day)}
            </span>
            {labels.length > 0 ? (
              <span
                data-testid={`day-label-${day}`}
                className="text-[9px] leading-tight text-center break-words"
                // NOT var(--text-dim). A planned day's label was drawn dim at
                // 8.5px and was invisible on a phone, so a day carrying a
                // category read as an empty one.
                style={{ color: trained ? "var(--accent)" : "var(--text)" }}
                aria-hidden
              >
                {labels.join(", ")}
              </span>
            ) : null}
          </>
        );

        const style = {
          // 44 is the floor SPEC.md sets for a touch target.
          minHeight: 44,
          minWidth: 0,
          borderRadius: "var(--radius-square)",
          background: trained ? "var(--accent-dim)" : "var(--surface)",
          // Planned is a dashed edge rather than a lighter colour, so the state
          // survives greyscale and low vision.
          borderStyle: planned ? ("dashed" as const) : ("solid" as const),
          borderColor: planned || isToday ? "var(--accent)" : "var(--surface-border)",
          color: "var(--text)",
        };
        const shared = {
          "data-testid": `day-${day}`,
          "data-today": String(isToday),
          "data-trained": String(trained),
          "data-planned": String(planned),
          className: "flex flex-col items-center justify-start flex-1 gap-1 px-0.5 py-1.5 border",
          style,
        };

        // A day with nothing to open is not a control. Rendering seven buttons
        // that do nothing would announce seven buttons to a screen reader and
        // invite a tap that never answers.
        return onPick ? (
          <button
            key={day}
            type="button"
            aria-label={name}
            onClick={() => onPick(day)}
            {...shared}
          >
            {content}
          </button>
        ) : (
          <div key={day} role="img" aria-label={name} {...shared}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
