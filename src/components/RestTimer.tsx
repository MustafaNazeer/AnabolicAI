"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formatDuration } from "@/lib/workout/timer";

const ctrlStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text-dim)",
  minWidth: 44,
  minHeight: 44,
} as const;

export function RestTimer({ defaultSeconds }: { defaultSeconds: number }) {
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running && !firedRef.current) {
      firedRef.current = true;
      setRunning(false);
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

  function reset(to: number) {
    firedRef.current = false;
    setRemaining(to);
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
          onClick={() => reset(Math.max(0, remaining - 15))}
          aria-label="Minus 15 seconds"
          className="px-2 text-sm"
          style={ctrlStyle}
        >
          -15
        </button>
        <button
          type="button"
          onClick={() => reset(remaining + 15)}
          aria-label="Plus 15 seconds"
          className="px-2 text-sm"
          style={ctrlStyle}
        >
          +15
        </button>
        <button
          type="button"
          onClick={() => {
            firedRef.current = false;
            setRunning((r) => !r);
          }}
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
          onClick={() => {
            setRunning(false);
            reset(defaultSeconds);
          }}
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
