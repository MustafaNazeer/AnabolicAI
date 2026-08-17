// src/app/DashboardView.tsx
"use client";

import { useState } from "react";
import { WeekStrip } from "@/components/dashboard/WeekStrip";
import { MatrixCard } from "@/components/dashboard/MatrixCard";
import { StatChip } from "@/components/dashboard/StatChip";
import { DashboardHeader } from "@/components/DashboardHeader";
import { NamePrompt } from "@/components/NamePrompt";
import { PlannerDaySheet } from "@/components/PlannerDaySheet";
import { PlannerBalance } from "@/components/PlannerBalance";
import type { MatrixDay } from "@/lib/progress/matrix";
import type { WeeklySummary } from "@/lib/progress/types";
// Types only. dayQueries reaches the database through the server client, so a
// value import here would pull it into the browser bundle; `import type` is
// erased at compile time and every other type in this file arrives the same
// way.
import type { PlannerDay } from "@/lib/planner/week";
import type { PlannerCategory } from "@/lib/planner/dayQueries";

// Home is deliberately short: the week, the activity matrix, and the three
// numbers. Personal records, recent workouts, the goals summary and the
// insights card all used to sit below these and were removed on 2026-08-16.
// Goals still live on Progress, and so does the insights card; the two lists
// were read only displays with no links in them, so nothing became unreachable.
export function DashboardView({
  name,
  askName = false,
  weekly,
  streakWeeks,
  matrixDays,
  week,
  today,
  workoutDays,
  plannerOn = false,
  plannerDays = [],
  plannerCategories = [],
}: {
  name: string;
  // Whether this account has ever been asked what to call it. Defaults false so
  // a caller that has not been taught about the prompt shows no card at all.
  askName?: boolean;
  weekly: WeeklySummary;
  streakWeeks: number;
  matrixDays: MatrixDay[];
  week: string[];
  today: string;
  workoutDays: string[];
  // The week planner, for gated accounts only. Every one of these defaults to
  // off or empty so an existing caller keeps behaving exactly as it did.
  plannerOn?: boolean;
  plannerDays?: PlannerDay[];
  plannerCategories?: PlannerCategory[];
}) {
  // Both derived from the one list rather than fetched again: the strip and the
  // balance only resolve an id to a name, while the sheet needs the ordered
  // categories to render a chip each.
  //
  // NAMES COME FROM EVERY CATEGORY, THE PICKER ONLY FROM THE VISIBLE ONES, and
  // the difference is what makes hiding safe. A day logged before a label was
  // hidden still carries it, so the name has to keep resolving or a past week
  // silently loses what it recorded. Two shapes from one query, never two
  // queries that can drift.
  const categoryNames = Object.fromEntries(plannerCategories.map((c) => [c.id, c.name]));
  const pickableCategories = plannerCategories.filter((c) => !c.hidden);
  // Which day's sheet is open, by key, or none. Held here rather than inside
  // the strip because the sheet sits beside the strip rather than inside a day.
  const [openDay, setOpenDay] = useState<string | null>(null);

  return (
    <main className="px-4 pt-12 pb-28">
      <DashboardHeader name={name} />

      {/*
        Asked once, at the top, where the greeting it changes already is.
        The card records a refusal too, so dismissing it settles the question
        rather than deferring it to the next load.
      */}
      {askName ? <NamePrompt /> : null}

      {/*
        One strip for every account. A gated account additionally gets its
        categories on each day and can tap one open; everyone else gets the same
        calendar as a read only summary of the week.
      */}
      <WeekStrip
        week={week}
        workoutDays={workoutDays}
        days={plannerDays}
        categoryNames={categoryNames}
        onPick={plannerOn ? setOpenDay : undefined}
      />

      {plannerOn ? (
        <>
          {openDay ? (
            <div className="mt-2.5">
              <PlannerDaySheet
                // Keyed by day so moving between two days rebuilds the sheet
                // rather than carrying the first day's picks onto the second.
                key={openDay}
                day={openDay}
                categories={pickableCategories}
                initial={plannerDays.find((d) => d.day === openDay) ?? null}
                onDone={() => setOpenDay(null)}
              />
            </div>
          ) : null}
          <PlannerBalance days={plannerDays} categoryNames={categoryNames} />
        </>
      ) : null}

      <MatrixCard days={matrixDays} today={today} />

      <div className="flex gap-2.5 mt-3.5">
        <StatChip value={`${weekly.workouts}`} label="Workouts" />
        <StatChip value={`${weekly.sets}`} label="Sets" />
        <StatChip value={`${streakWeeks}`} unit="wk" label="Streak" />
      </div>
    </main>
  );
}
