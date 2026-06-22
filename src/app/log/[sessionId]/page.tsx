import { notFound } from "next/navigation";
import { getSessionDetail, getLastSets } from "@/lib/workout/queries";
import { createClient } from "@/lib/supabase/server";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import type { LastSet } from "@/lib/workout/types";

export default async function ActiveWorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();

  const lastEntries = await Promise.all(
    session.exercises.map(
      async (item) =>
        [item.exercise.id, await getLastSets(item.exercise.id, sessionId)] as const,
    ),
  );
  const lastByExercise: Record<string, LastSet[]> = Object.fromEntries(lastEntries);

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("rest_timer_seconds")
    .maybeSingle();
  const restSeconds = settings?.rest_timer_seconds ?? 120;

  return (
    <ActiveWorkout
      session={session}
      lastByExercise={lastByExercise}
      restSeconds={restSeconds}
    />
  );
}
