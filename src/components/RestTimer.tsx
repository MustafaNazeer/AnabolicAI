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

export function RestTimer({ defaultSeconds }: { defaultSeconds: number }) {
  // While running, the deadline is the source of truth and `remaining` is only
  // what gets painted. Decrementing state on an interval instead loses every
  // callback the browser throttles, coalesces or skips, which on a backgrounded
  // iOS PWA is most of them.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const firedRef = useRef(false);
  const running = deadline !== null;

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => setRemaining(secondsUntil(deadline, Date.now()));
    // Paint once immediately so starting the timer does not show a stale value
    // for up to a second.
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (remaining === 0 && running && !firedRef.current) {
      firedRef.current = true;
      setDeadline(null);
      try {
        navigator.vibrate?.(400);
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch {
        // Audio or vibrate unavailable; the visual zero is enough.
      }
    }
  }, [remaining, running]);

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
