import { notFound } from "next/navigation";
import {
  getSessionDetail,
  getLastSets,
  getExerciseLibrary,
} from "@/lib/workout/queries";
import { createClient } from "@/lib/supabase/server";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import { isStale, lastActivityAt } from "@/lib/workout/stale";
import type { LastRef, LocalSet, Snapshot } from "@/lib/offline/store";

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
  const lastByExercise: Record<string, LastRef[]> = Object.fromEntries(lastEntries);

  const library = await getExerciseLibrary();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("rest_timer_seconds")
    .maybeSingle();
  const restSeconds = settings?.rest_timer_seconds ?? 120;

  const snapshot: Snapshot = {
    sessionId: session.id,
    routineName: session.routineName,
    restSeconds,
    exercises: session.exercises.map((e) => ({
      exerciseId: e.exercise.id,
      name: e.exercise.name,
      muscleGroup: e.exercise.muscle_group,
      isDefault: e.exercise.is_default,
      defaultSets: e.defaultSets,
    })),
    lastByExercise,
    swaps: session.swaps,
    library,
  };

  const serverSets: LocalSet[] = session.exercises.flatMap((e) =>
    e.loggedSets.map((s) => ({
      id: s.id,
      sessionId: session.id,
      exerciseId: e.exercise.id,
      setNumber: s.set_number,
      reps: s.reps,
      weight: s.weight,
      rir: s.rir,
      syncState: "synced" as const,
    })),
  );

  const stale = isStale(
    lastActivityAt(session.startedAt, session.setTimes),
    new Date(),
  );

  return (
    <ActiveWorkout
      snapshot={snapshot}
      serverSets={serverSets}
      startedAt={session.startedAt}
      stale={stale}
    />
  );
}
