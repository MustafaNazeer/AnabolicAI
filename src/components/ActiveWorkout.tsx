"use client";

import { useRouter } from "next/navigation";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import { RestTimer } from "@/components/RestTimer";
import { finishSession } from "@/lib/workout/actions";
import type { SessionDetail, LastSet } from "@/lib/workout/types";

export function ActiveWorkout({
  session,
  lastByExercise,
  restSeconds,
}: {
  session: SessionDetail;
  lastByExercise: Record<string, LastSet[]>;
  restSeconds: number;
}) {
  const router = useRouter();

  return (
    <main className="px-5 pt-12 pb-28">
      <h1 className="text-2xl font-bold mb-1">{session.routineName}</h1>
      <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
        Tap the check to log each set.
      </p>

      <div className="sticky top-2 z-10 mb-4">
        <RestTimer defaultSeconds={restSeconds} />
      </div>

      <div className="flex flex-col gap-3">
        {session.exercises.map((item) => (
          <ExerciseLogCard
            key={item.exercise.id}
            sessionId={session.id}
            item={item}
            lastSets={lastByExercise[item.exercise.id] ?? []}
            onLogged={() => router.refresh()}
          />
        ))}
      </div>

      <form action={finishSession.bind(null, session.id)} className="mt-6">
        <button
          type="submit"
          className="rounded-xl font-semibold py-3 w-full"
          style={{ background: "var(--surface-2)", color: "var(--text)", minHeight: 48 }}
        >
          Finish workout
        </button>
      </form>
    </main>
  );
}
