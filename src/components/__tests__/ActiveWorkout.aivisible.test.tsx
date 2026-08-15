import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

// The card is the real one; only the quick entry control below it is stubbed,
// so this asserts what ActiveWorkout hands down rather than what a mock chooses
// to render.
vi.mock("@/components/QuickEntry", () => ({
  QuickEntry: () => <div data-testid="quick-entry" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { ActiveWorkout } from "@/components/ActiveWorkout";

const SNAPSHOT: ComponentProps<typeof ActiveWorkout>["snapshot"] = {
  sessionId: "s1",
  routineName: "Push",
  restSeconds: 120,
  exercises: [
    {
      exerciseId: "e1",
      name: "Bench Press",
      muscleGroup: "Chest",
      isDefault: true,
      defaultSets: 3,
    },
  ],
  lastByExercise: {},
  swaps: [],
  library: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("quick entry visibility on the logging screen", () => {
  it("renders quick entry on the card by default", () => {
    render(
      <ActiveWorkout snapshot={SNAPSHOT} serverSets={[]} />,
    );
    expect(screen.getAllByTestId("quick-entry").length).toBeGreaterThan(0);
  });

  // This is the surface the switch exists for above all others. Quick entry is
  // the only one of the three that repeats per exercise, so a six exercise
  // routine carries six copies of it on the app's centerpiece screen, where
  // space is scarcest.
  it("removes quick entry from every card when hidden", () => {
    render(
      <ActiveWorkout
        snapshot={SNAPSHOT}
        serverSets={[]}
        aiQuickEntry
        aiVisible={false}
      />,
    );
    expect(screen.queryByTestId("quick-entry")).not.toBeInTheDocument();
  });

  it("keeps quick entry when the switch is on and consent is given", () => {
    render(
      <ActiveWorkout
        snapshot={SNAPSHOT}
        serverSets={[]}
        aiQuickEntry
        aiVisible
      />,
    );
    expect(screen.getAllByTestId("quick-entry").length).toBeGreaterThan(0);
  });
});
