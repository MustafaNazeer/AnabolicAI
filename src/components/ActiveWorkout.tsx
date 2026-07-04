"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import { RestTimer } from "@/components/RestTimer";
import { logSet, deleteSet, finishSession } from "@/lib/workout/actions";
import { createIdbStore } from "@/lib/offline/idb";
import {
  seedSession,
  logSetLocal,
  deleteSetLocal,
  finishLocal,
} from "@/lib/offline/mutations";
import { drainOutbox, type Runners } from "@/lib/offline/sync";
import { useOnline } from "@/lib/offline/useOnline";
import type { LocalSet, Snapshot } from "@/lib/offline/store";

function buildRunners(): Runners {
  return {
    async logSet(p) {
      try {
        const r = await logSet(
          p.sessionId,
          p.id,
          p.exerciseId,
          p.setNumber,
          p.reps,
          p.weight,
          p.rir,
        );
        return r?.error ? { ok: false, kind: "validation" } : { ok: true };
      } catch {
        return { ok: false, kind: "network" };
      }
    },
    async deleteSet(p) {
      try {
        await deleteSet(p.id, p.sessionId);
        return { ok: true };
      } catch {
        return { ok: false, kind: "network" };
      }
    },
    async finishSession(p) {
      try {
        const r = await finishSession(p.sessionId);
        return r?.error ? { ok: false, kind: "validation" } : { ok: true };
      } catch {
        return { ok: false, kind: "network" };
      }
    },
  };
}

export function ActiveWorkout({
  snapshot,
  serverSets,
}: {
  snapshot: Snapshot;
  serverSets: LocalSet[];
}) {
  const router = useRouter();
  const online = useOnline();
  const store = useMemo(() => createIdbStore(), []);
  const runners = useMemo(() => buildRunners(), []);
  const [sets, setSets] = useState<LocalSet[]>(serverSets);
  const sessionId = snapshot.sessionId;

  const refresh = useCallback(async () => {
    setSets(await store.listSets(sessionId));
  }, [store, sessionId]);

  const sync = useCallback(async () => {
    await drainOutbox(store, runners);
    await refresh();
  }, [store, runners, refresh]);

  // Seed the local store from the server snapshot on mount, render from it,
  // then flush anything already queued.
  useEffect(() => {
    let active = true;
    (async () => {
      await seedSession(store, snapshot, serverSets);
      if (!active) return;
      await refresh();
      if (navigator.onLine) await sync();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foreground sync triggers (iOS has no background sync).
  useEffect(() => {
    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void sync();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  const handleLog = useCallback(
    async (exerciseId: string, input: { reps: number; weight: number; rir: number }) => {
      await logSetLocal(store, sessionId, exerciseId, input, () => crypto.randomUUID());
      await refresh();
      if (navigator.onLine) void sync();
    },
    [store, sessionId, refresh, sync],
  );

  const handleDelete = useCallback(
    async (setId: string) => {
      await deleteSetLocal(store, setId);
      await refresh();
      if (navigator.onLine) void sync();
    },
    [store, refresh, sync],
  );

  const handleFinish = useCallback(async () => {
    await finishLocal(store, sessionId);
    if (navigator.onLine) await sync();
    router.push("/");
  }, [store, sessionId, sync, router]);

  const hasPending = sets.some((s) => s.syncState === "pending");

  return (
    <main className="px-5 pt-12 pb-28">
      <h1
        className="text-[26px] font-semibold mb-1"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        {snapshot.routineName}
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
        Tap the check to log each set.
      </p>

      {!online ? (
        <div
          role="status"
          className="text-sm px-4 py-2 mb-4"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-tile)",
            color: "var(--text-dim)",
          }}
        >
          Offline. Your sets are saved and will sync when you&apos;re back.
        </div>
      ) : hasPending ? (
        <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
          Syncing...
        </p>
      ) : null}

      <div className="sticky top-2 z-10 mb-4">
        <RestTimer defaultSeconds={snapshot.restSeconds} />
      </div>

      <div className="flex flex-col gap-3">
        {snapshot.exercises.map((ex) => (
          <ExerciseLogCard
            key={ex.exerciseId}
            exerciseName={ex.name}
            defaultSets={ex.defaultSets}
            loggedSets={sets.filter((s) => s.exerciseId === ex.exerciseId)}
            lastSets={snapshot.lastByExercise[ex.exerciseId] ?? []}
            onLog={(input) => void handleLog(ex.exerciseId, input)}
            onDelete={(setId) => void handleDelete(setId)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleFinish()}
        className="font-semibold py-3 w-full mt-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-tile)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "var(--text)",
          minHeight: 48,
        }}
      >
        Finish workout
      </button>
    </main>
  );
}
