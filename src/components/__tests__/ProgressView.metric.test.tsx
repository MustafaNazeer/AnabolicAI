import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressView } from "@/components/ProgressView";
import type { ProgressData, RoutineVolumeData } from "@/lib/progress/types";

const data: ProgressData = {
  exercises: [{ id: "ex1", name: "Bench Press" }],
  series: {
    ex1: [
      { sessionId: "s1", date: "2026-06-01", maxWeight: 135, e1rm: 160, volume: 3240, topSetReps: 8 },
      { sessionId: "s2", date: "2026-06-08", maxWeight: 145, e1rm: 170, volume: 3480, topSetReps: 6 },
    ],
  },
};

const emptyRoutines: RoutineVolumeData = { routines: [], series: {} };

const routineVolume: RoutineVolumeData = {
  routines: [
    { id: "r1", name: "Push Day" },
    { id: "r2", name: "Leg Day" },
  ],
  series: {
    r1: {
      exercises: [{ id: "bench", name: "Bench Press" }],
      points: [
        { sessionId: "s1", date: "2026-06-01", total: 500, byExercise: { bench: 500 } },
      ],
    },
    r2: {
      exercises: [{ id: "squat", name: "Squat" }],
      points: [
        { sessionId: "s2", date: "2026-06-02", total: 900, byExercise: { squat: 900 } },
      ],
    },
  },
};

beforeEach(() => localStorage.clear());

describe("ProgressView metric switcher", () => {
  it("shows the weight chart title by default", () => {
    render(<ProgressView data={data} routineVolume={emptyRoutines} goals={{}} aiPlateau={false} />);
    expect(screen.getByRole("heading", { name: "Weight over time" })).toBeInTheDocument();
  });

  it("switches to the volume chart and persists the choice", async () => {
    render(<ProgressView data={data} routineVolume={emptyRoutines} goals={{}} aiPlateau={false} />);
    await userEvent.click(screen.getByRole("tab", { name: "Volume" }));
    expect(
      screen.getByRole("heading", { name: "Total weight moved per session" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("onyx-progress-metric")).toBe("volume");
  });

  it("switches to the reps chart", async () => {
    render(<ProgressView data={data} routineVolume={emptyRoutines} goals={{}} aiPlateau={false} />);
    await userEvent.click(screen.getByRole("tab", { name: "Reps" }));
    expect(
      screen.getByRole("heading", { name: "Reps on your heaviest set" }),
    ).toBeInTheDocument();
  });
});

describe("ProgressView routine section", () => {
  it("shows the most recent routine and its legend by default", () => {
    render(<ProgressView data={data} routineVolume={routineVolume} goals={{}} aiPlateau={false} />);
    expect(
      screen.getByRole("heading", { name: "Volume by exercise" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Exercises" })).toHaveTextContent(
      "Bench Press",
    );
  });

  it("switches the routine series when a different routine is picked", async () => {
    render(<ProgressView data={data} routineVolume={routineVolume} goals={{}} aiPlateau={false} />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Routine" }),
      "Leg Day",
    );
    expect(screen.getByRole("list", { name: "Exercises" })).toHaveTextContent(
      "Squat",
    );
  });

  it("shows an empty message when no routine has completed sessions", () => {
    render(<ProgressView data={data} routineVolume={emptyRoutines} goals={{}} aiPlateau={false} />);
    expect(
      screen.getByText(
        "Complete a routine and its volume breakdown will appear here.",
      ),
    ).toBeInTheDocument();
  });
});
