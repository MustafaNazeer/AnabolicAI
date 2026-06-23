import { Check, Star } from "lucide-react";
import type { WeekDay } from "@/lib/progress/weekstrip";

export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <div className="flex justify-center gap-2 mt-4">
      {days.map((d, i) => {
        const isToday = d.state === "today";
        const isDone = d.state === "done";
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>
              {d.letter}
            </span>
            <span
              className="flex items-center justify-center border"
              style={{
                width: 31,
                height: 31,
                borderRadius: "var(--radius-square)",
                background: isToday
                  ? "var(--accent)"
                  : isDone
                    ? "var(--accent-dim)"
                    : "var(--surface)",
                borderColor: "var(--surface-border)",
                color: isToday ? "var(--on-accent)" : "var(--accent)",
              }}
            >
              {isToday ? <Star size={13} aria-hidden /> : isDone ? <Check size={13} aria-hidden /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
