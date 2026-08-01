import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import type { Snapshot } from "@/lib/offline/store";

const { runViewTransition } = vi.hoisted(() => ({
  runViewTransition: vi.fn((update: () => void) => update()),
}));

vi.mock("@/lib/motion/viewTransition", () => ({ runViewTransition }));
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

beforeEach(() => {
  runViewTransition.mockClear();
  // Offline isolates the local commit from the outbox drain, so these tests
  // assert on the animation path only.
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
});

describe("ActiveWorkout motion", () => {
  it("does not animate when a refresh changes nothing", async () => {
    render(
      <ActiveWorkout
        snapshot={snapshot}
        serverSets={[
          {
            id: "s1",
            sessionId: "sess1",
            exerciseId: "bench",
            setNumber: 1,
            reps: 8,
            weight: 135,
            rirLow: null,
            rirHigh: null,
            syncState: "synced",
          },
        ]}
      />,
    );
    // The mount seed re-reads the same set it was given.
    expect(await screen.findByText("Set 1: 8 for 135 lbs")).toBeInTheDocument();
    expect(runViewTransition).not.toHaveBeenCalled();
  });

  it("animates when a set is logged", async () => {
    render(<ActiveWorkout snapshot={snapshot} serverSets={[]} />);
    await screen.findByRole("heading", { level: 3, name: "Bench Press" });
    runViewTransition.mockClear();

    await userEvent.type(screen.getByRole("textbox", { name: "Reps" }), "8");
    await userEvent.type(screen.getByRole("textbox", { name: "Weight" }), "135");
    await userEvent.click(screen.getByRole("button", { name: "Log set" }));

    expect(await screen.findByText("Set 1: 8 for 135 lbs")).toBeInTheDocument();
    expect(runViewTransition).toHaveBeenCalled();
  });
});
