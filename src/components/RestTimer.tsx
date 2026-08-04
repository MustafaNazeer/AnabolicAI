"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formatDuration, secondsUntil } from "@/lib/workout/timer";
import { RestDurationPicker } from "@/components/RestDurationPicker";
import { clampRest } from "@/lib/workout/duration";
import { runViewTransition } from "@/lib/motion/viewTransition";

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
  onDurationChange,
}: {
  defaultSeconds: number;
  alertOnFinish?: boolean;
  onDurationChange?: (seconds: number) => void;
}) {
  // The duration a fresh rest starts at. Seeded from the setting, then owned
  // here, so a value chosen mid workout survives a reset and every later rest.
  const [duration, setDuration] = useState(() => clampRest(defaultSeconds));
  // While running, the deadline is the source of truth and `remaining` is only
  // what gets painted. Decrementing state on an interval instead loses every
  // callback the browser throttles, coalesces or skips, which on a backgrounded
  // iOS PWA is most of them.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(() => clampRest(defaultSeconds));
  const [picking, setPicking] = useState(false);
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
    setRemaining(duration);
  }

  // OPENING is animated; CLOSING never is, and that asymmetry is deliberate.
  // A view transition across a shrink holds the taller old snapshot over the
  // already reflowed layout for the whole animation, so the input boxes hang
  // below the collapsed tile for 200ms. Measured in headless Chrome: at 100ms
  // the tile had reached its collapsed height while the boxes were still
  // painted outside it. Dropping the panel's own view-transition-name did not
  // fix it and naming the tile instead was worse, so the close simply does not
  // run through a transition at all.
  function closePicker() {
    setPicking(false);
  }

  function pickDuration(seconds: number) {
    firedRef.current = false;
    setDuration(seconds);
    // Committing closes the panel, so it takes the same instant path. The cost
    // is that the countdown does not cross fade into its new value.
    closePicker();
    // Restarting is deliberate: the number just chosen is the number shown.
    if (deadline !== null) setDeadline(Date.now() + seconds * 1000);
    else setRemaining(seconds);
    // A preference write that throws must not interrupt the update the user
    // already committed to.
    try {
      onDurationChange?.(seconds);
    } catch {
      // Saving the preference is best effort and must never interrupt a rest.
    }
  }

  return (
    <div
      className="px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            picking ? closePicker() : runViewTransition(() => setPicking(true))
          }
          aria-label="Change rest duration"
          // Fills the row so that everything on the tile except play and reset
          // opens the picker. Growing the button is what makes that possible
          // without nesting buttons or putting a click handler on a container,
          // which would also fire when the open picker's own inputs are tapped.
          className="flex-1 text-left text-2xl font-semibold tabular-nums"
          style={{
            fontFamily: "var(--font-spectral)",
            color: "var(--accent)",
            minHeight: 44,
            // Its own name, distinct from the panel's, so committing a new
            // duration cross fades the old number into the new one instead of
            // snapping. The per second repaints are not wrapped in a
            // transition, so a running countdown does not animate every tick.
            viewTransitionName: "rest-countdown",
          }}
        >
          {formatDuration(remaining)}
        </button>
        <div className="flex items-center gap-2">
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
      {picking ? (
        <div className="onyx-lift" style={{ viewTransitionName: "rest-duration" }}>
          <RestDurationPicker
            seconds={duration}
            onPick={pickDuration}
            onCancel={closePicker}
          />
        </div>
      ) : null}
    </div>
  );
}
