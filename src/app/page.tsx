// src/app/page.tsx
import { getDashboardData, getMatrixData } from "@/lib/progress/queries";
import { getWeekPlanner } from "@/lib/planner/queries";
import { getDisplayName } from "@/lib/profile/queries";
import { greetingName, needsName } from "@/lib/profile/name";
import { getPlannerWeek, getPlannerCategories } from "@/lib/planner/dayQueries";
import { plannerWeek } from "@/lib/planner/week";
import { dayKey, dateKeyInZone } from "@/lib/progress/matrix";
import { zonedNow, APP_TIMEZONE } from "@/lib/notifications/schedule";
import { getVerifiedUser } from "@/lib/auth/user";
import { DashboardView } from "@/app/DashboardView";

export default async function HomePage() {
  const now = new Date();
  // Both reads are independent, so they go together.
  const [data, matrixDays, displayName] = await Promise.all([
    getDashboardData(now),
    getMatrixData(now),
    getDisplayName(),
  ]);

  // The week the strip draws, and the two facts it needs about it. Every date
  // is resolved in APP_TIMEZONE through the existing helpers rather than in
  // whatever zone the server happens to run in.
  const week = plannerWeek(now, APP_TIMEZONE);
  const today = dayKey(zonedNow(now, APP_TIMEZONE));
  const workoutDays = data.recent.map((w) => dateKeyInZone(w.completedAt, APP_TIMEZONE));

  // The gate is read on its own and first, because the two planner reads must
  // not happen at all for an account without it. Folding them into the block
  // above would issue both queries for every user on every dashboard load and
  // then throw the rows away, which is the opposite of what the flag is for.
  const plannerOn = await getWeekPlanner();
  const [plannerDays, plannerCategories] = plannerOn
    ? await Promise.all([getPlannerWeek(now), getPlannerCategories()])
    : [[], []];

  const user = await getVerifiedUser();
  const name = greetingName(displayName, user?.email);

  return (
    <DashboardView
      name={name}
      askName={needsName(displayName)}
      weekly={data.weekly}
      streakWeeks={data.streakWeeks}
      matrixDays={matrixDays}
      week={week}
      today={today}
      workoutDays={workoutDays}
      plannerOn={plannerOn}
      plannerDays={plannerDays}
      plannerCategories={plannerCategories}
    />
  );
}
