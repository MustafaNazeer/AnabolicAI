import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import { createMemoryStore } from "@/lib/offline/memoryStore";
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

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
});

describe("the pinned rest timer", () => {
  // The app is installed to the home screen and runs standalone, where
  // `statusBarStyle: "black-translucent"` plus `viewportFit: "cover"` put the
  // top of the layout viewport at the physical top of the screen rather than
  // below the clock. So a bare offset pins the timer UNDER the status bar and
  // the Dynamic Island, which is worse on the newer phones because their inset
  // is larger. The sticky itself was never broken; only its origin was wrong.
  //
  // jsdom performs no layout and resolves no `env()`, so this pins the
  // declaration rather than the rendered position. That is the most a test here
  // can do, and it is enough to stop the offset being silently dropped again.
  it("offsets its pinned position by the top safe area", async () => {
    render(<ActiveWorkout snapshot={snapshot} serverSets={[]} />);
    await screen.findByRole("heading", { level: 3, name: "Bench Press" });

    const pinned = screen
      .getByRole("button", { name: "Start timer" })
      .closest(".sticky");

    expect(pinned).not.toBeNull();
    expect(pinned?.getAttribute("style") ?? "").toContain(
      "env(safe-area-inset-top)",
    );
  });
});
