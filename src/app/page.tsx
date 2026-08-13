// src/app/page.tsx
import { getDashboardData, getMatrixData } from "@/lib/progress/queries";
import { getActiveGoalsSummary } from "@/lib/goals/queries";
import { getAiInsights } from "@/lib/ai/queries";
import { weekStripDays } from "@/lib/progress/weekstrip";
import { APP_TIMEZONE } from "@/lib/notifications/schedule";
import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/app/DashboardView";

export default async function HomePage() {
  const now = new Date();
  const [data, matrixDays, goals] = await Promise.all([
    getDashboardData(now),
    getMatrixData(now),
    getActiveGoalsSummary(),
  ]);
  const aiInsights = await getAiInsights();
  const weekDays = weekStripDays(
    data.recent.map((w) => ({ completedAt: w.completedAt })),
    now,
    APP_TIMEZONE,
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
