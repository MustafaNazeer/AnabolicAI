import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";

const noop = vi.fn();

const base = {
  exerciseName: "Barbell Bench",
  defaultSets: 3,
  loggedSets: [],
  lastSets: [],
  onLog: noop,
  onDelete: noop,
};

describe("ExerciseLogCard swap affordance", () => {
  it("offers a swap control with an accessible name", async () => {
    const onSwap = vi.fn();
    render(<ExerciseLogCard {...base} onSwap={onSwap} />);
    const button = screen.getByRole("button", { name: /swap barbell bench/i });
    await userEvent.click(button);
    expect(onSwap).toHaveBeenCalledOnce();
  });

  it("has no swap control when no handler is given", () => {
    render(<ExerciseLogCard {...base} />);
    expect(screen.queryByRole("button", { name: /swap/i })).not.toBeInTheDocument();
  });

  it("names what it replaced when it is the only card for the slot", () => {
    render(
      <ExerciseLogCard
        {...base}
        role="replacement"
        originalName="Pec Deck"
        onSwap={noop}
      />,
    );
    expect(screen.getByText("Swapped out Pec Deck")).toBeInTheDocument();
  });

  it("does not repeat the label when the original is on screen", () => {
    render(
      <ExerciseLogCard {...base} role="replacement" originalName={null} onSwap={noop} />,
    );
    expect(screen.queryByText(/swapped out/i)).not.toBeInTheDocument();
  });

  it("marks a swapped out original and gives it no logging controls", () => {
    render(
      <ExerciseLogCard
        {...base}
        exerciseName="Pec Deck"
        role="swappedOutOriginal"
        loggedSets={[
          {
            id: "s1",
            sessionId: "sess1",
            exerciseId: "pecdeck",
            setNumber: 1,
            reps: 10,
            weight: 120,
            rirLow: 2,
            rirHigh: 2,
            syncState: "synced",
          },
        ]}
      />,
    );
    expect(screen.getByText(/swapped out/i)).toBeInTheDocument();
    expect(screen.getByText("Set 1: 10 for 120 lbs")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log set/i })).not.toBeInTheDocument();
  });

  it("offers undo only when a handler is given", async () => {
    const onUndoSwap = vi.fn();
    const { rerender } = render(
      <ExerciseLogCard {...base} role="replacement" originalName="Pec Deck" onSwap={noop} />,
    );
    expect(
      screen.queryByRole("button", { name: /undo swap/i }),
    ).not.toBeInTheDocument();

    rerender(
      <ExerciseLogCard
        {...base}
        role="replacement"
        originalName="Pec Deck"
        onSwap={noop}
        onUndoSwap={onUndoSwap}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /undo swap/i }));
    expect(onUndoSwap).toHaveBeenCalledOnce();
  });
});
