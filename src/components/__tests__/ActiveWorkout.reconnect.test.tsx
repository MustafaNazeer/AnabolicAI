import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import { logSet } from "@/lib/workout/actions";
import type { Snapshot } from "@/lib/offline/store";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/workout/actions", () => ({
  logSet: vi.fn(),
  deleteSet: vi.fn(),
  finishSession: vi.fn(),
  swapExercise: vi.fn(),
  undoSwap: vi.fn(),
}));
vi.mock("@/lib/offline/idb", () => ({ createIdbStore: () => createMemoryStore() }));

const snapshot: Snapshot = {
  sessionId: "sess1",
  routineName: "Push Day",
  restSeconds: 120,
  exercises: [
    {
      exerciseId: "bench",
      name: "Bench Press",
      muscleGroup: "chest",
      isDefault: true,
      defaultSets: 3,
    },
  ],
  lastByExercise: {},
  swaps: [],
  library: [],
};

function setOnline(v: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: v,
    writable: true,
  });
}

// Lets a settled microtask chain (a store read, a refresh, a sync) reach the
// DOM before the next assertion. Fake timers are active for the whole file,
// and screen.findByRole's own polling depends on a global `jest` this project
// never sets, so waiting through it silently hangs; advancing the fake clock
// by zero still drains the microtask queue in front of it.
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

// Logs one set while offline, so it lands in the store pending with its op
// still queued, then leaves the render there for a test to pick up.
async function renderWithAPendingSet() {
  setOnline(false);
  const view = render(<ActiveWorkout snapshot={snapshot} serverSets={[]} />);
  await flush();

  fireEvent.change(screen.getByRole("textbox", { name: "Reps" }), {
    target: { value: "8" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Weight" }), {
    target: { value: "135" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Log set" }));
  await flush();

  expect(screen.getByRole("img", { name: "Not yet synced" })).toBeInTheDocument();
  return view;
}

beforeEach(() => {
  vi.mocked(logSet).mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ActiveWorkout retrying a stalled reconnect", () => {
  it("drains the outbox on the next interval even though no online event fired", async () => {
    await renderWithAPendingSet();
    expect(logSet).not.toHaveBeenCalled();
    setOnline(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(logSet).toHaveBeenCalled();
  });

  it("does not run the interval while nothing is pending", async () => {
    setOnline(true);
    render(<ActiveWorkout snapshot={snapshot} serverSets={[]} />);
    await flush();
    vi.mocked(logSet).mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(logSet).not.toHaveBeenCalled();
  });

  it("clears the interval on unmount", async () => {
    const { unmount } = await renderWithAPendingSet();
    unmount();
    setOnline(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(logSet).not.toHaveBeenCalled();
  });
});
