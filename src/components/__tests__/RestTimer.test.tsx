import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RestTimer } from "@/components/RestTimer";

const T0 = new Date("2026-08-03T12:00:00.000Z").getTime();

const vibrate = vi.fn();

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  vibrate.mockClear();
  Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
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
  it("alerts once when the rest runs out with the app open", () => {
    render(<RestTimer defaultSeconds={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    vi.setSystemTime(T0 + 30_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(vibrate).toHaveBeenCalledTimes(1);
    // Finishing stops the timer.
    expect(screen.getByRole("button", { name: "Start timer" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
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
    expect(vibrate).not.toHaveBeenCalled();

    act(() => {
      setHidden(false);
    });

    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(vibrate).toHaveBeenCalledTimes(1);
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
    expect(vibrate).not.toHaveBeenCalled();
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
    expect(vibrate).not.toHaveBeenCalled();
  });
});
