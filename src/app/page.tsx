// src/app/page.tsx
import { getDashboardData, getMatrixData } from "@/lib/progress/queries";
import { getActiveGoalsSummary } from "@/lib/goals/queries";
import { getAiInsights } from "@/lib/ai/queries";
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
      aiInsights={aiInsights}
    />
  );
}
