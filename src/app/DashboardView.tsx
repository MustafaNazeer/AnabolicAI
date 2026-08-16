// src/app/DashboardView.tsx
"use client";

import { Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { WeekStrip } from "@/components/dashboard/WeekStrip";
import { MatrixCard } from "@/components/dashboard/MatrixCard";
import { StatChip } from "@/components/dashboard/StatChip";
import { GoalsSummary } from "@/components/dashboard/GoalsSummary";
import { InsightsCard } from "@/components/InsightsCard";
import { DashboardHeader } from "@/components/DashboardHeader";
import { formatCompact } from "@/lib/progress/strength";
import { pluralize } from "@/lib/format/plural";
import type { MatrixDay } from "@/lib/progress/matrix";
import type { WeekDay } from "@/lib/progress/weekstrip";
import type { PersonalRecord } from "@/lib/progress/prs";
import type { RecentWorkout, WeeklySummary } from "@/lib/progress/types";
import type { GoalWithProgress } from "@/lib/goals/types";
// Types only. dayQueries reaches the database through the server client, so a
// value import here would pull it into the browser bundle; `import type` is
// erased at compile time and every other type in this file arrives the same
// way.
import type { PlannerDay } from "@/lib/planner/week";
import type { PlannerCategory } from "@/lib/planner/dayQueries";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardView({
  name,
  weekly,
  streakWeeks,
  prs,
  recent,
  weekDays,
  matrixDays,
  goals = [],
  aiInsights,
  aiVisible = true,
}: {
  name: string;
  weekly: WeeklySummary;
  streakWeeks: number;
  prs: PersonalRecord[];
  recent: RecentWorkout[];
  weekDays: WeekDay[];
  matrixDays: MatrixDay[];
  goals?: GoalWithProgress[];
  aiInsights: boolean;
  // Defaults visible, matching the column, so a caller that has not been taught
  // about the switch shows the card rather than silently swallowing it.
  aiVisible?: boolean;
  // The week planner, for gated accounts only. Every one of these defaults to
  // off or empty so an existing caller, including the tests that already render
  // this view, keeps behaving exactly as it did.
  //
  // plannerWeekDays is the seven day keys of the current week and plannerDays
  // is only the days that have a row, which is usually fewer. The interface
  // pairs them; the query deliberately does not return five nulls.
  plannerOn?: boolean;
  plannerWeekDays?: string[];
  plannerDays?: PlannerDay[];
  plannerCategories?: PlannerCategory[];
}) {
  return (
    <main className="px-4 pt-12 pb-28">
      <DashboardHeader name={name} />

      <WeekStrip days={weekDays} />

      <MatrixCard days={matrixDays} />

      <div className="flex gap-2.5 mt-3.5">
        <StatChip value={`${weekly.workouts}`} label="Workouts" />
        <StatChip value={`${weekly.sets}`} label="Sets" />
        <StatChip value={`${streakWeeks}`} unit="wk" label="Streak" />
      </div>

      <GoalsSummary goals={goals} />

      {/*
        The card owns its own "Insights" heading, so this removes the whole
        block rather than only the button. Gating the button alone would leave
        a labelled empty box on the dashboard.
      */}
      {aiVisible && recent.length > 0 ? (
        <InsightsCard initialEnabled={aiInsights} />
      ) : null}

      <section className="mt-[18px]">
        <h2
          className="text-[10.5px] uppercase tracking-[.11em] mb-2.5"
          style={{ color: "var(--text-dim)" }}
        >
          Recent personal records
        </h2>
        {prs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Keep logging. New bests show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {prs.map((pr) => (
              <li key={`${pr.exerciseId}-${pr.loggedAt}`}>
                <Card
                  className="flex items-center gap-3 px-3.5 py-2.5"
                  style={{ borderRadius: "var(--radius-tile)" }}
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
                    <Star size={14} aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span
                      className="block text-[15px] font-semibold"
                      style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
                    >
                      {pr.exerciseName}
                    </span>
                    <span className="block text-[10.5px]" style={{ color: "var(--text-dim)" }}>
                      New best this week
                    </span>
                  </span>
                  <span
                    className="text-[14px] font-semibold"
                    style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
                  >
                    {pr.weight} &times; {pr.reps}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-[18px]">
        <h2
          className="text-[10.5px] uppercase tracking-[.11em] mb-2.5"
          style={{ color: "var(--text-dim)" }}
        >
          Recent workouts
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No workouts yet. Start one from the Log tab.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((w) => (
              <li key={w.id}>
                <Card
                  className="flex items-center justify-between px-3.5 py-2.5"
                  style={{ borderRadius: "var(--radius-tile)" }}
                >
                  <span>
                    <span className="block font-medium" style={{ color: "var(--text)" }}>
                      {w.routineName}
                    </span>
                    <span className="block text-xs" style={{ color: "var(--text-dim)" }}>
                      {shortDate(w.completedAt)}
                    </span>
                  </span>
                  <span className="text-xs text-right" style={{ color: "var(--text-dim)" }}>
                    {pluralize(w.sets, "set")}
                    <br />
                    {formatCompact(w.volume)} lbs
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
