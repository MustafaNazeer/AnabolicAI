// src/app/page.tsx
import { getDashboardData, getMatrixData } from "@/lib/progress/queries";
import { getActiveGoalsSummary } from "@/lib/goals/queries";
import { getAiInsights } from "@/lib/ai/queries";
import { getWeekPlanner } from "@/lib/planner/queries";
import { getPlannerWeek, getPlannerCategories } from "@/lib/planner/dayQueries";
import { plannerWeek } from "@/lib/planner/week";
import { weekStripDays } from "@/lib/progress/weekstrip";
import { APP_TIMEZONE } from "@/lib/notifications/schedule";
import { getVerifiedUser } from "@/lib/auth/user";
import { DashboardView } from "@/app/DashboardView";

export default async function HomePage() {
  const now = new Date();
  // All four reads are independent, so they go together. Awaiting the
  // consent flag on its own added a round trip to every dashboard load,
  // including for the users who never turn insights on.
  const [data, matrixDays, goals, aiInsights] = await Promise.all([
    getDashboardData(now),
    getMatrixData(now),
    getActiveGoalsSummary(),
    getAiInsights(),
  ]);
  const weekDays = weekStripDays(
    data.recent.map((w) => ({ completedAt: w.completedAt })),
    now,
    APP_TIMEZONE,
  );

  // The gate is read on its own and first, because the two planner reads must
  // not happen at all for an account without it. Folding them into the block
  // above would issue both queries for every user on every dashboard load and
  // then throw the rows away, which is the opposite of what the flag is for.
  const plannerOn = await getWeekPlanner();
  const [plannerDays, plannerCategories] = plannerOn
    ? await Promise.all([getPlannerWeek(now), getPlannerCategories()])
    : [[], []];

  const user = await getVerifiedUser();
  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <DashboardView
      name={name}
      weekly={data.weekly}
      streakWeeks={data.streakWeeks}
      prs={data.prs}
      recent={data.recent}
      weekDays={weekDays}
      matrixDays={matrixDays}
      goals={goals}
      aiInsights={aiInsights.enabled}
      aiVisible={aiInsights.visible}
      plannerOn={plannerOn}
      plannerWeekDays={plannerWeek(now, APP_TIMEZONE)}
      plannerDays={plannerDays}
      plannerCategories={plannerCategories}
    />
  );
}
