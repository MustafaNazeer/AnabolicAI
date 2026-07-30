import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";

const noop = vi.fn();

describe("ExerciseLogCard field order", () => {
  it("renders the reps input before the weight input", () => {
    const { container } = render(
      <ExerciseLogCard
        exerciseName="Bench Press"
        defaultSets={3}
        loggedSets={[]}
        lastSets={[]}
        onLog={noop}
        onDelete={noop}
      />,
    );
    const labels = [...container.querySelectorAll("label")].map((l) =>
      (l.textContent ?? "").trim(),
    );
    const reps = labels.findIndex((t) => t.startsWith("Reps"));
    const weight = labels.findIndex((t) => t.startsWith("Weight"));
    expect(reps).toBeGreaterThanOrEqual(0);
    expect(weight).toBeGreaterThan(reps);
  });

  it("reads a logged set as reps for weight", () => {
    render(
      <ExerciseLogCard
        exerciseName="Bench Press"
        defaultSets={3}
        loggedSets={[
          {
            id: "s1",
            sessionId: "sess1",
            exerciseId: "ex1",
            setNumber: 1,
            reps: 8,
            weight: 135,
            rir: 2,
            syncState: "synced",
          },
        ]}
        lastSets={[]}
        onLog={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Set 1: 8 for 135 lbs")).toBeInTheDocument();
  });

  it("reads the quick fill reference as reps for weight", () => {
    render(
      <ExerciseLogCard
        exerciseName="Bench Press"
        defaultSets={3}
        loggedSets={[]}
        lastSets={[{ set_number: 1, reps: 8, weight: 135, rir: 2 }]}
        onLog={noop}
        onDelete={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: /8 reps for 135 pounds/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Last time: 8 for 135 lbs/)).toBeInTheDocument();
  });
});
