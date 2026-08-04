"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import { ExercisePicker } from "@/components/ExercisePicker";
import { RestTimer } from "@/components/RestTimer";
import { StaleSessionBanner } from "@/components/StaleSessionBanner";
import {
  buildEffectiveCards,
  takenExerciseIds,
  orphanedExerciseIds,
} from "@/lib/workout/swap";
import {
  logSet,
  deleteSet,
  updateSet,
  finishSession,
  swapExercise,
  undoSwap,
  setRestDuration,
} from "@/lib/workout/actions";
import { createIdbStore } from "@/lib/offline/idb";
import {
  seedSession,
  logSetLocal,
  deleteSetLocal,
  editSetLocal,
  finishLocal,
  swapLocal,
  undoSwapLocal,
} from "@/lib/offline/mutations";
import { drainOutbox, type Runners } from "@/lib/offline/sync";
import { useOnline } from "@/lib/offline/useOnline";
import { runViewTransition } from "@/lib/motion/viewTransition";
import {
  readSessionState,
  sameSessionState,
  type SessionState,
} from "@/lib/offline/sessionState";
import type { LocalSet, Snapshot } from "@/lib/offline/store";

function buildRunners(): Runners {
  return {
    async logSet(p) {
      // A set queued by a build from before the range change carries a single
      // `rir` and no pair. Treat it as a range of one so it can still sync,
      // rather than failing forever and blocking everything behind it.
      const low = p.rirLow ?? p.rir ?? null;
      const high = p.rirHigh ?? p.rir ?? null;
      try {
        const r = await logSet(
          p.sessionId,
          p.id,
          p.exerciseId,
          p.setNumber,
          p.reps,
          p.weight,
          low,
          high,
        );
        if (r && "error" in r) {
          // Only client-invalid input is droppable; every server error retries.
          return { ok: false, kind: r.retryable ? "retry" : "drop" };
        }
        return { ok: true };
      } catch {
        return { ok: false, kind: "retry" };
      }
    },
    async deleteSet(p) {
      try {
        const r = await deleteSet(p.id, p.sessionId);
        return r && "error" in r ? { ok: false, kind: "retry" } : { ok: true };
      } catch {
        return { ok: false, kind: "retry" };
      }
    },
    async updateSet(p) {
      try {
        const r = await updateSet(
          p.id,
          p.sessionId,
          p.reps,
          p.weight,
          p.rirLow,
          p.rirHigh,
        );
        if (r && "error" in r) {
          // Only client-invalid input is droppable; every server error retries.
          return { ok: false, kind: r.retryable ? "retry" : "drop" };
        }
        return { ok: true };
      } catch {
        return { ok: false, kind: "retry" };
      }
    },
    async finishSession(p) {
      try {
        const r = await finishSession(p.sessionId);
        return r && "error" in r ? { ok: false, kind: "retry" } : { ok: true };
      } catch {
        return { ok: false, kind: "retry" };
      }
    },
    async swapExercise(p) {
      try {
        const r = await swapExercise(
          p.sessionId,
          p.originalExerciseId,
          p.replacementExerciseId,
        );
        if (r && "error" in r) {
          return { ok: false, kind: r.retryable ? "retry" : "drop" };
        }
        return { ok: true };
      } catch {
        return { ok: false, kind: "retry" };
      }
    },
    async undoSwap(p) {
      try {
        const r = await undoSwap(p.sessionId, p.originalExerciseId);
        if (r && "error" in r) {
          return { ok: false, kind: r.retryable ? "retry" : "drop" };
        }
        return { ok: true };
      } catch {
        return { ok: false, kind: "retry" };
      }
    },
  };
}

export function ActiveWorkout({
  snapshot,
  serverSets,
  startedAt,
  stale = false,
  restAlert = true,
}: {
  snapshot: Snapshot;
  serverSets: LocalSet[];
  startedAt?: string;
  stale?: boolean;
  restAlert?: boolean;
}) {
  const router = useRouter();
  const online = useOnline();
  const store = useMemo(() => createIdbStore(), []);
  const runners = useMemo(() => buildRunners(), []);
  const [sets, setSets] = useState<LocalSet[]>(serverSets);
  const [swaps, setSwaps] = useState(snapshot.swaps);
  // The routine exercise whose slot the picker is currently choosing for.
  const [picking, setPicking] = useState<string | null>(null);
  const sessionId = snapshot.sessionId;

  // The last committed state, held in a ref so the commit and refresh callbacks
  // keep stable dependencies. Reading it from state instead would rebuild them on
  // every logged set and churn the visibilitychange effect.
  const stateRef = useRef<SessionState>({
    sets: serverSets,
    swaps: snapshot.swaps,
  });

  const commit = useCallback((next: SessionState, also?: () => void) => {
    stateRef.current = next;
    runViewTransition(() => {
      also?.();
      setSets(next.sets);
      setSwaps(next.swaps);
    });
  }, []);

  const refresh = useCallback(async () => {
    const next = await readSessionState(store, sessionId, stateRef.current.swaps);
    // Nothing visible changed, so do not animate. This is the common case on
    // mount and after a sync that only confirmed what was already on screen.
    if (sameSessionState(stateRef.current, next)) {
      stateRef.current = next;
      return;
    }
    commit(next);
  }, [store, sessionId, commit]);

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
    async (
      exerciseId: string,
      input: {
        reps: number;
        weight: number;
        rirLow: number | null;
        rirHigh: number | null;
      },
    ) => {
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

  const handleEdit = useCallback(
    async (
      setId: string,
      input: {
        reps: number;
        weight: number;
        rirLow: number | null;
        rirHigh: number | null;
      },
    ) => {
      await editSetLocal(store, setId, input);
      await refresh();
      if (navigator.onLine) void sync();
    },
    [store, refresh, sync],
  );

  const handleSwap = useCallback(
    async (slotExerciseId: string, replacementId: string) => {
      await swapLocal(store, sessionId, slotExerciseId, replacementId);
      const next = await readSessionState(store, sessionId, stateRef.current.swaps);
      // Always animate, even if the swap itself changed nothing: closing the
      // picker is a visible change, and it has to share one transition with the
      // card change or the second interrupts the first.
      commit(next, () => setPicking(null));
      if (navigator.onLine) void sync();
    },
    [store, sessionId, commit, sync],
  );

  const handleUndoSwap = useCallback(
    async (slotExerciseId: string) => {
      await undoSwapLocal(store, sessionId, slotExerciseId);
      await refresh();
      if (navigator.onLine) void sync();
    },
    [store, sessionId, refresh, sync],
  );

  const handleFinish = useCallback(async () => {
    await finishLocal(store, sessionId);
    if (navigator.onLine) await sync();
    router.push("/");
  }, [store, sessionId, sync, router]);

  const hasPending = sets.some((s) => s.syncState === "pending");

  const setCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sets) counts[s.exerciseId] = (counts[s.exerciseId] ?? 0) + 1;
    return counts;
  }, [sets]);

  const cards = useMemo(
    () =>
      buildEffectiveCards(
        snapshot.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          defaultSets: e.defaultSets,
        })),
        swaps,
        snapshot.library,
        setCounts,
      ),
    [snapshot.exercises, snapshot.library, swaps, setCounts],
  );

  // Sets logged against an exercise no card shows, which happens when a slot
  // is swapped more than once. Grouped rather than dropped so work actually
  // performed is never invisible.
  const orphans = useMemo(
    () => orphanedExerciseIds(cards, setCounts),
    [cards, setCounts],
  );

  const nameFor = useCallback(
    (id: string) =>
      snapshot.library.find((e) => e.id === id)?.name ??
      snapshot.exercises.find((e) => e.exerciseId === id)?.name ??
      "Exercise",
    [snapshot.library, snapshot.exercises],
  );

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

      {stale && startedAt ? (
        <StaleSessionBanner
          sessionId={sessionId}
          startedAt={startedAt}
          onFinish={() => void handleFinish()}
        />
      ) : null}

      {/* Installed to the home screen the app runs standalone under a
          translucent status bar, so the layout viewport starts at the physical
          top of the screen. Offsetting by the top inset keeps the pinned timer
          clear of the clock and the Dynamic Island, the same way the tab bar
          clears the home indicator. */}
      <div
        className="sticky z-10 mb-4"
        style={{ top: "calc(0.5rem + env(safe-area-inset-top))" }}
      >
        <RestTimer
          defaultSeconds={snapshot.restSeconds}
          alertOnFinish={restAlert}
          onDurationChange={(seconds) => void setRestDuration(seconds)}
        />
      </div>

      {picking ? (
        <div
          className="onyx-lift mb-3"
          style={{ viewTransitionName: "exercise-picker" }}
        >
          <p className="text-sm mb-2" style={{ color: "var(--text-dim)" }}>
            Swap in a different exercise for today
          </p>
          <ExercisePicker
            library={snapshot.library}
            takenIds={takenExerciseIds(cards)}
            onAdd={(e) => void handleSwap(picking, e.id)}
            onCreated={(e) => void handleSwap(picking, e.id)}
          />
          <button
            type="button"
            onClick={() => runViewTransition(() => setPicking(null))}
            className="text-xs underline underline-offset-2 mt-2"
            style={{ color: "var(--text-dim)", minHeight: 44 }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <ExerciseLogCard
            key={`${c.slotExerciseId}:${c.exerciseId}`}
            exerciseName={c.name}
            defaultSets={c.defaultSets}
            role={c.role}
            originalName={c.originalName}
            loggedSets={sets.filter((s) => s.exerciseId === c.exerciseId)}
            lastSets={snapshot.lastByExercise[c.exerciseId] ?? []}
            onLog={(input) => void handleLog(c.exerciseId, input)}
            onDelete={(setId) => void handleDelete(setId)}
            onEdit={(setId, input) => void handleEdit(setId, input)}
            onSwap={
              c.role === "swappedOutOriginal"
                ? undefined
                : () => runViewTransition(() => setPicking(c.slotExerciseId))
            }
            onUndoSwap={
              c.role === "replacement" && c.canUndo
                ? () => void handleUndoSwap(c.slotExerciseId)
                : undefined
            }
          />
        ))}
      </div>

      {orphans.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm mb-2" style={{ color: "var(--text-dim)" }}>
            Also logged this session
          </h2>
          <div className="flex flex-col gap-3">
            {orphans.map((id) => (
              <ExerciseLogCard
                key={id}
                exerciseName={nameFor(id)}
                defaultSets={0}
                role="swappedOutOriginal"
                loggedSets={sets.filter((s) => s.exerciseId === id)}
                lastSets={[]}
                onLog={() => {}}
                onDelete={(setId) => void handleDelete(setId)}
              />
            ))}
          </div>
        </section>
      ) : null}

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
