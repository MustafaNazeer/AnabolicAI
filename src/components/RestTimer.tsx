"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formatDuration, secondsUntil } from "@/lib/workout/timer";

const ctrlStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text-dim)",
  minWidth: 44,
  minHeight: 44,
} as const;

export function RestTimer({
  defaultSeconds,
  alertOnFinish = true,
}: {
  defaultSeconds: number;
  alertOnFinish?: boolean;
}) {
  // While running, the deadline is the source of truth and `remaining` is only
  // what gets painted. Decrementing state on an interval instead loses every
  // callback the browser throttles, coalesces or skips, which on a backgrounded
  // iOS PWA is most of them.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const firedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const running = deadline !== null;

  // iOS builds an AudioContext in the suspended state unless it is constructed
  // during a user gesture, and nothing un-suspends it on its own. A context
  // built when the rest ends therefore renders nothing at all, and the beep
  // only becomes audible on the next tap, when the gesture unlocks audio and
  // the stale oscillator finally plays. Building it here is the fix, because
  // starting the timer is the one moment a real gesture is guaranteed.
  function unlockAudio() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      if (!audioRef.current) audioRef.current = new Ctor();
      void audioRef.current.resume?.();
    } catch {
      // Audio unavailable; the visual countdown is enough.
    }
  }

  function alertFinished() {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      // Backgrounding can suspend a context that was already unlocked. Resuming
      // one that a gesture has unlocked needs no further gesture, so this is
      // safe to call from the tick.
      void ctx.resume?.();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio unavailable; the visual zero is enough.
    }
  }

  useEffect(() => {
    if (deadline === null) return;

    const tick = () => {
      const left = secondsUntil(deadline, Date.now());
      setRemaining(left);
      // The tick owns this rather than a separate effect, for two reasons.
      // Audio is suspended while the page is hidden, so firing there would burn
      // the one alert on something nobody perceives.
      // And recomputing on return cannot rescue it, because setting `remaining`
      // to a value it already holds does not re-run an effect keyed on it.
      if (left === 0 && !firedRef.current && !document.hidden) {
        firedRef.current = true;
        setDeadline(null);
        if (alertOnFinish) alertFinished();
      }
    };

    // Paint once immediately so starting the timer, or coming back to it, does
    // not show a stale value for up to a second.
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, alertOnFinish]);

  // Both directions clear the guard, matching the behaviour of the shared reset
  // helper this replaced, so adding time to a finished timer can fire again.
  function shift(delta: number) {
    firedRef.current = false;
    if (deadline !== null) {
      setDeadline(Math.max(Date.now(), deadline + delta * 1000));
    } else {
      setRemaining((r) => Math.max(0, r + delta));
    }
  }

  function toggle() {
    firedRef.current = false;
    if (deadline === null) {
      // Inside the tap handler, so this is a real user gesture.
      unlockAudio();
      setDeadline(Date.now() + remaining * 1000);
    } else {
      setRemaining(secondsUntil(deadline, Date.now()));
      setDeadline(null);
    }
  }

  function reset() {
    firedRef.current = false;
    setDeadline(null);
    setRemaining(defaultSeconds);
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <span
        className="text-2xl font-semibold tabular-nums"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--accent)" }}
      >
        {formatDuration(remaining)}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => shift(-15)}
          aria-label="Minus 15 seconds"
          className="px-2 text-sm"
          style={ctrlStyle}
        >
          -15
        </button>
        <button
          type="button"
          onClick={() => shift(15)}
          aria-label="Plus 15 seconds"
          className="px-2 text-sm"
          style={ctrlStyle}
        >
          +15
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={running ? "Pause timer" : "Start timer"}
          className="flex items-center justify-center"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            borderRadius: "var(--radius-square)",
            minWidth: 44,
            minHeight: 44,
          }}
        >
          {running ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reset timer"
          className="flex items-center justify-center"
          style={ctrlStyle}
        >
          <RotateCcw size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
