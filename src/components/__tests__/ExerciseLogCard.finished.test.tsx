import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import type { LocalSet } from "@/lib/offline/store";

const set = (n: number): LocalSet => ({
  id: `s${n}`,
  sessionId: "sess",
  exerciseId: "e1",
  setNumber: n,
  reps: 8,
  weight: 135,
  rirLow: null,
  rirHigh: null,
  syncState: "synced",
});

const base = {
  exerciseName: "Bench Press",
  lastSets: [],
  onLog: vi.fn(),
  onDelete: vi.fn(),
};

describe("the finished card state", () => {
  it("hides the input row once the target is reached", () => {
    const { rerender } = render(
      <ExerciseLogCard {...base} defaultSets={3} loggedSets={[set(1), set(2)]} />,
    );
    expect(screen.getByRole("button", { name: "Log set" })).toBeInTheDocument();

    rerender(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2), set(3)]}
      />,
    );
    expect(screen.queryByRole("button", { name: "Log set" })).toBeNull();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("brings the row back when another set is asked for", () => {
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2), set(3)]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add another set" }));
    expect(screen.getByRole("button", { name: "Log set" })).toBeInTheDocument();
  });

  // The naive condition hides the row again after every extra set, so each one
  // costs an extra tap. The latch is the whole point.
  it("stays open for a second extra set without asking again", () => {
    const { rerender } = render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2), set(3)]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add another set" }));

    rerender(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2), set(3), set(4)]}
      />,
    );
    expect(screen.getByRole("button", { name: "Log set" })).toBeInTheDocument();
  });

  it("collapses again after deleting back under the target", () => {
    const { rerender } = render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2), set(3)]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add another set" }));

    // Deleting clears the latch, so re-reaching the target collapses once more.
    rerender(
      <ExerciseLogCard {...base} defaultSets={3} loggedSets={[set(1), set(2)]} />,
    );
    expect(screen.getByRole("button", { name: "Log set" })).toBeInTheDocument();

    rerender(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2), set(3)]}
      />,
    );
    expect(screen.queryByRole("button", { name: "Log set" })).toBeNull();
  });

  // The "Also logged this session" cards pass defaultSets={0}. They are read
  // only today so they never reach this condition, but a zero target must never
  // be treated as "already reached" or a later change makes them unloggable.
  it("never treats a zero target as reached", () => {
    render(<ExerciseLogCard {...base} defaultSets={0} loggedSets={[]} />);
    expect(screen.getByRole("button", { name: "Log set" })).toBeInTheDocument();
    expect(screen.queryByText("Done")).toBeNull();
  });
});
