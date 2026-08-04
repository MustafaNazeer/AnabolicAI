import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RestTimer } from "@/components/RestTimer";
import { runViewTransition } from "@/lib/motion/viewTransition";

// Passing the update straight through keeps every existing test behaving as it
// did, while making the call itself observable. jsdom implements no
// startViewTransition, so the real helper would silently take its fallback
// branch and a missing call would be invisible.
vi.mock("@/lib/motion/viewTransition", () => ({
  runViewTransition: vi.fn((update: () => void) => update()),
}));

const T0 = new Date("2026-08-03T12:00:00.000Z").getTime();

// jsdom implements no Web Audio at all, so the alert is observed through a
// stub. This replaced asserting on navigator.vibrate, which iOS Safari does not
// implement, so those assertions passed while the actual beep was silent on the
// only device this app targets.
class FakeOscillator {
  frequency = { value: 0 };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  resume = vi.fn(async () => {});
  createOscillator = vi.fn(() => {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  });
  constructor() {
    FakeAudioContext.made.push(this);
  }
}

// Every oscillator started across every context, which is what "did it beep"
// actually means.
function beeps(): number {
  return FakeAudioContext.made.reduce(
    (n, c) => n + c.oscillators.filter((o) => o.start.mock.calls.length > 0).length,
    0,
  );
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  vi.mocked(runViewTransition).mockClear();
  FakeAudioContext.made = [];
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RestTimer", () => {
  it("shows the default duration before it is started", () => {
    render(<RestTimer defaultSeconds={120} />);
    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  // The bug this component had: it decremented state on a one second interval,
  // so every callback the browser throttled or skipped was a second the timer
  // never counted. Here a whole minute of wall clock passes while only ONE
  // interval callback runs, which is what backgrounding an iOS PWA looks like.
  it("counts elapsed time, not the number of interval callbacks", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    vi.setSystemTime(T0 + 59_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // 60 seconds of a 120 second rest have really gone by.
    expect(screen.getByText("1:00")).toBeInTheDocument();
    expect(screen.queryByText("1:59")).not.toBeInTheDocument();
  });

  it("holds its value while paused", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    vi.setSystemTime(T0 + 29_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));

    // Real time keeps passing, but a paused timer must not move.
    vi.setSystemTime(T0 + 90_000);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  it("resumes from where it was paused", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    vi.setSystemTime(T0 + 29_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));

    vi.setSystemTime(T0 + 300_000);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  it("returns to the default duration on reset", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    vi.setSystemTime(T0 + 45_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByText("2:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();
  });
});

describe("RestTimer finishing", () => {
  // iOS creates an AudioContext suspended unless it is built during a user
  // gesture, and nothing un-suspends it on its own. Building it when the rest
  // ends, which happens on an interval tick, produced no sound at all until the
  // next tap unlocked audio and the stale oscillator finally played.
  it("builds the audio context on the start tap, not when the rest ends", () => {
    render(<RestTimer defaultSeconds={30} />);
    expect(FakeAudioContext.made).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    expect(FakeAudioContext.made).toHaveLength(1);

    vi.setSystemTime(T0 + 30_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // Reused, never rebuilt, because a context built here would be suspended.
    expect(FakeAudioContext.made).toHaveLength(1);
    expect(FakeAudioContext.made[0].resume).toHaveBeenCalled();
  });

  it("alerts once when the rest runs out with the app open", () => {
    render(<RestTimer defaultSeconds={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    vi.setSystemTime(T0 + 30_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(beeps()).toBe(1);
    // Finishing stops the timer.
    expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(beeps()).toBe(1);
  });

  it("stays silent while the app is hidden, then alerts on return", () => {
    render(<RestTimer defaultSeconds={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    setHidden(true);
    vi.setSystemTime(T0 + 30_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // The rest is over but the user is not looking, and audio and vibrate do
    // nothing in this state, so firing here would waste the one alert.
    expect(beeps()).toBe(0);

    act(() => {
      setHidden(false);
    });

    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(beeps()).toBe(1);
  });

  it("catches up immediately on return without waiting for a tick", () => {
    render(<RestTimer defaultSeconds={300} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    setHidden(true);
    vi.setSystemTime(T0 + 120_000);
    act(() => {
      setHidden(false);
    });

    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(beeps()).toBe(0);
  });

  it("stays silent when the sound setting is off", () => {
    render(<RestTimer defaultSeconds={30} alertOnFinish={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    vi.setSystemTime(T0 + 30_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // The countdown still finishes and still shows zero; only the alert is off.
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();
    expect(beeps()).toBe(0);
  });
});

describe("choosing a rest duration", () => {
  it("no longer offers the fifteen second buttons", () => {
    render(<RestTimer defaultSeconds={120} />);
    expect(screen.queryByRole("button", { name: "Plus 15 seconds" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Minus 15 seconds" })).toBeNull();
  });

  it("opens the picker from the countdown and applies a choice", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Minutes" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Set duration/ }));

    expect(screen.getByText("3:00")).toBeInTheDocument();
    // The picker closes once a value is set.
    expect(screen.queryByRole("group", { name: "Rest duration" })).toBeNull();
  });

  it("leaves the duration alone when the picker is cancelled", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Minutes" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel duration change" }));

    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  // The whole point: set it once at bench and every bench rest uses it.
  it("keeps the chosen duration for the next rest", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Minutes" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Set duration/ }));

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    vi.setSystemTime(T0 + 180_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("0:00")).toBeInTheDocument();

    // Reset goes back to the CHOSEN value, not the prop.
    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("restarts a running rest at the new duration", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    vi.setSystemTime(T0 + 30_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("1:29")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Minutes" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Set duration/ }));

    // The number you picked is the number you see. The 31 seconds served are
    // discarded, which is the accepted cost.
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("reports the choice upward, and survives a handler that throws", () => {
    const onDurationChange = vi.fn(() => {
      throw new Error("offline");
    });
    render(
      <RestTimer defaultSeconds={120} onDurationChange={onDurationChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));
    fireEvent.click(screen.getByRole("button", { name: /^Set duration/ }));

    expect(onDurationChange).toHaveBeenCalledWith(120);
    // Failing to save a preference must not interrupt a workout.
    expect(screen.getByText("2:00")).toBeInTheDocument();
  });
});

describe("the picker's motion", () => {
  // The defect this pins: the panel carried the onyx-lift class but nothing
  // ever started a view transition, so the class did nothing and the panel
  // snapped open and shut.
  it("runs opening the picker through a view transition", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));

    expect(runViewTransition).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("group", { name: "Rest duration" })).toBeInTheDocument();
  });

  // CLOSING IS DELIBERATELY NOT ANIMATED, and restoring the symmetry would
  // reintroduce a real visual defect. A view transition across a shrink holds
  // the taller old snapshot over the already reflowed layout for the whole
  // animation, so the input boxes visibly hang below the collapsed tile for
  // 200ms. Confirmed in headless Chrome: at 100ms the tile had reached its
  // collapsed height while the boxes were still painted outside it. Removing
  // the panel's own view-transition-name did not help, and naming the tile
  // instead was worse.
  it("closes instantly rather than through a view transition", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));
    vi.mocked(runViewTransition).mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Cancel duration change" }));

    expect(runViewTransition).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Rest duration" })).toBeNull();
  });

  it("closes instantly when the timer face is tapped again", () => {
    render(<RestTimer defaultSeconds={120} />);
    const face = screen.getByRole("button", { name: "Change rest duration" });
    fireEvent.click(face);
    vi.mocked(runViewTransition).mockClear();

    fireEvent.click(face);

    expect(runViewTransition).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Rest duration" })).toBeNull();
  });

  // Committing closes the panel too, so it takes the same instant path. The
  // cost is accepted: the countdown no longer cross fades into its new value.
  it("commits instantly rather than through a view transition", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Change rest duration" }));
    vi.mocked(runViewTransition).mockClear();

    fireEvent.change(screen.getByRole("textbox", { name: "Minutes" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Set duration/ }));

    expect(runViewTransition).not.toHaveBeenCalled();
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Rest duration" })).toBeNull();
  });

  // Two elements cannot share a view transition name, and both are on screen
  // together while the panel is open.
  //
  // Asserted against the raw style attribute rather than with toHaveStyle,
  // matching ActiveWorkout.safearea.test.tsx:59. toHaveStyle goes through
  // getComputedStyle, which is not reliable for a property jsdom does not
  // implement.
  it("gives the countdown its own view transition name", () => {
    render(<RestTimer defaultSeconds={120} />);
    const countdown = screen.getByRole("button", { name: "Change rest duration" });
    expect(countdown.getAttribute("style") ?? "").toContain(
      "view-transition-name: rest-countdown",
    );
  });
});

describe("scheduling the background notification", () => {
  it("reports the deadline when a rest starts", () => {
    const onRestStart = vi.fn(async () => true);
    render(<RestTimer defaultSeconds={120} onRestStart={onRestStart} />);

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    expect(onRestStart).toHaveBeenCalledWith(T0 + 120_000);
  });

  it("says so when the notification could not be scheduled", async () => {
    const onRestStart = vi.fn(async () => false);
    render(<RestTimer defaultSeconds={120} onRestStart={onRestStart} />);

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    await act(async () => {});

    expect(screen.getByText(/no alert/i)).toBeInTheDocument();
  });

  it("says nothing when scheduling worked", async () => {
    const onRestStart = vi.fn(async () => true);
    render(<RestTimer defaultSeconds={120} onRestStart={onRestStart} />);

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    await act(async () => {});

    expect(screen.queryByText(/no alert/i)).toBeNull();
  });

  // A dead spot followed by signal must not leave a stale warning on screen.
  it("clears the notice on the next successful start", async () => {
    const onRestStart = vi
      .fn<(d: number) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(<RestTimer defaultSeconds={120} onRestStart={onRestStart} />);

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    await act(async () => {});
    expect(screen.getByText(/no alert/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    await act(async () => {});

    expect(screen.queryByText(/no alert/i)).toBeNull();
  });
});

describe("the countdown's tap target", () => {
  // Everything on the tile except play and reset should open the picker. That
  // is done by growing the countdown button to fill the row rather than by
  // putting a handler on a container, which would nest buttons and would also
  // fire when the open picker's own inputs are tapped.
  //
  // jsdom performs no layout, so the class is the only observable. This still
  // has teeth: dropping flex-1 shrinks the target back to the digits alone,
  // which is the exact regression worth catching.
  it("fills the row so the whole readout area opens the picker", () => {
    render(<RestTimer defaultSeconds={120} />);
    const countdown = screen.getByRole("button", { name: "Change rest duration" });
    expect(countdown).toHaveClass("flex-1");
    expect(countdown).toHaveClass("text-left");
  });

  // Growing the button must not put it in front of the two controls.
  it("still leaves play and reset tappable in their own right", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    expect(screen.getByRole("button", { name: "Pause timer" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Rest duration" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByText("2:00")).toBeInTheDocument();
    // Neither control may open the picker as a side effect.
    expect(screen.queryByRole("group", { name: "Rest duration" })).toBeNull();
  });
});
