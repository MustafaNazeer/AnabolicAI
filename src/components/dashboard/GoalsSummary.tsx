// src/components/dashboard/GoalsSummary.tsx
import Link from "next/link";
import { Target } from "lucide-react";
import { displayLbsToGo } from "@/lib/goals/progress";
import type { GoalWithProgress } from "@/lib/goals/types";

export function GoalsSummary({ goals }: { goals: GoalWithProgress[] }) {
  if (goals.length === 0) return null;
  // goals arrive sorted by lbsToGo ascending; the first is the closest.
  const closest = goals[0];
  const count = goals.length;
  const countLabel = count === 1 ? "1 active goal" : `${count} active goals`;
  const detail = closest.reached
    ? `${closest.exerciseName} reached`
    : `${closest.exerciseName} about ${displayLbsToGo(closest.lbsToGo)} lbs to go`;

  return (
    <Link href="/progress" className="block mt-3.5">
      <span
        className="flex items-center gap-3 px-3.5 py-2.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-tile)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--accent-dim)",
            color: "var(--accent)",
          }}
        >
          <Target size={14} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            {countLabel}
          </span>
          <span className="block text-[10.5px]" style={{ color: "var(--text-dim)" }}>
            {detail}
          </span>
        </span>
      </span>
    </Link>
  );
}
