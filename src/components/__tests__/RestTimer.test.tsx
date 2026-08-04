import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RestTimer } from "@/components/RestTimer";

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

  it("adds and removes fifteen seconds while running", () => {
    render(<RestTimer defaultSeconds={120} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    act(() => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Plus 15 seconds" }));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText("2:15")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Minus 15 seconds" }));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText("2:00")).toBeInTheDocument();
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
