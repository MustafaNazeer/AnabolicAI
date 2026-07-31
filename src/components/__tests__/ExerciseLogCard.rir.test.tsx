import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";

const base = {
  exerciseName: "Bench Press",
  defaultSets: 3,
  lastSets: [],
  onDelete: vi.fn(),
};

const loggedSet = (over: Record<string, unknown>) => ({
  id: "s1",
  sessionId: "sess1",
  exerciseId: "ex1",
  setNumber: 1,
  reps: 8,
  weight: 135,
  rirLow: null,
  rirHigh: null,
  syncState: "synced" as const,
  ...over,
});

describe("RIR input", () => {
  it("has no dropdown any more", () => {
    render(<ExerciseLogCard {...base} loggedSets={[]} onLog={vi.fn()} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("logs a single value in both ends", async () => {
    const onLog = vi.fn();
    render(<ExerciseLogCard {...base} loggedSets={[]} onLog={onLog} />);
    await userEvent.type(screen.getByLabelText(/^reps$/i), "8");
    await userEvent.type(screen.getByLabelText(/^weight$/i), "135");
    await userEvent.type(screen.getByLabelText(/^rir$/i), "2");
    await userEvent.click(screen.getByRole("button", { name: /log set/i }));
    expect(onLog).toHaveBeenCalledWith({
      reps: 8,
      weight: 135,
      rirLow: 2,
      rirHigh: 2,
    });
  });

  it("logs a blank RIR as nulls", async () => {
    const onLog = vi.fn();
    render(<ExerciseLogCard {...base} loggedSets={[]} onLog={onLog} />);
    await userEvent.type(screen.getByLabelText(/^reps$/i), "8");
    await userEvent.type(screen.getByLabelText(/^weight$/i), "135");
    await userEvent.click(screen.getByRole("button", { name: /log set/i }));
    expect(onLog).toHaveBeenCalledWith({
      reps: 8,
      weight: 135,
      rirLow: null,
      rirHigh: null,
    });
  });

  it("logs a range typed into both boxes", async () => {
    const onLog = vi.fn();
    render(<ExerciseLogCard {...base} loggedSets={[]} onLog={onLog} />);
    await userEvent.type(screen.getByLabelText(/^reps$/i), "8");
    await userEvent.type(screen.getByLabelText(/^weight$/i), "135");
    await userEvent.type(screen.getByLabelText(/^rir$/i), "0");
    await userEvent.type(screen.getByLabelText(/^to$/i), "1");
    await userEvent.click(screen.getByRole("button", { name: /log set/i }));
    expect(onLog).toHaveBeenCalledWith({
      reps: 8,
      weight: 135,
      rirLow: 0,
      rirHigh: 1,
    });
  });

  it("shows an error and does not log a reversed range", async () => {
    const onLog = vi.fn();
    render(<ExerciseLogCard {...base} loggedSets={[]} onLog={onLog} />);
    await userEvent.type(screen.getByLabelText(/^reps$/i), "8");
    await userEvent.type(screen.getByLabelText(/^weight$/i), "135");
    await userEvent.type(screen.getByLabelText(/^rir$/i), "3");
    await userEvent.type(screen.getByLabelText(/^to$/i), "1");
    await userEvent.click(screen.getByRole("button", { name: /log set/i }));
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/low to high/i);
  });

  it("shows both RIR boxes in one group with nothing to tap first", () => {
    render(<ExerciseLogCard {...base} loggedSets={[]} onLog={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Reps in reserve" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^rir$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^to$/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add an rir range/i }),
    ).not.toBeInTheDocument();
  });
});

describe("RIR on logged rows", () => {
  it("shows a single value", () => {
    render(
      <ExerciseLogCard
        {...base}
        loggedSets={[loggedSet({ rirLow: 2, rirHigh: 2 })]}
        onLog={vi.fn()}
      />,
    );
    expect(screen.getByText("Set 1: 8 for 135 lbs, 2 RIR")).toBeInTheDocument();
  });

  it("shows a range", () => {
    render(
      <ExerciseLogCard
        {...base}
        loggedSets={[loggedSet({ rirLow: 0, rirHigh: 1 })]}
        onLog={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Set 1: 8 for 135 lbs, 0-1 RIR"),
    ).toBeInTheDocument();
  });

  it("omits the RIR clause entirely when there is none", () => {
    render(
      <ExerciseLogCard {...base} loggedSets={[loggedSet({})]} onLog={vi.fn()} />,
    );
    expect(screen.getByText("Set 1: 8 for 135 lbs")).toBeInTheDocument();
  });
});
