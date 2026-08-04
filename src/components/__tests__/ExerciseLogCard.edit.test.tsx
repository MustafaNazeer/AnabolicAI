import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import type { LocalSet } from "@/lib/offline/store";

const set = (n: number, over: Partial<LocalSet> = {}): LocalSet => ({
  id: `s${n}`,
  sessionId: "sess",
  exerciseId: "e1",
  setNumber: n,
  reps: 8,
  weight: 135,
  rirLow: null,
  rirHigh: null,
  syncState: "synced",
  ...over,
});

const base = {
  exerciseName: "Bench Press",
  lastSets: [],
  onLog: vi.fn(),
  onDelete: vi.fn(),
};

describe("editing a logged set", () => {
  it("loads the set's values into the input row", () => {
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1, { reps: 6, weight: 155, rirLow: 1, rirHigh: 2 })]}
        onEdit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit set 1/ }));

    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("6");
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("155");
    expect(screen.getByRole("textbox", { name: "RIR" })).toHaveValue("1");
    expect(screen.getByText("Editing set 1")).toBeInTheDocument();
  });

  it("saves the corrected values", async () => {
    const onEdit = vi.fn();
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1)]}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit set 1/ }));
    const weight = screen.getByRole("textbox", { name: "Weight" });
    await userEvent.clear(weight);
    await userEvent.type(weight, "155");
    fireEvent.click(screen.getByRole("button", { name: "Save set" }));

    expect(onEdit).toHaveBeenCalledWith("s1", {
      reps: 8,
      weight: 155,
      rirLow: null,
      rirHigh: null,
    });
  });

  it("gives back what you were typing when you cancel", async () => {
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1)]}
        onEdit={vi.fn()}
      />,
    );

    // Half way through entering the next set when you spot the mistake.
    await userEvent.type(screen.getByRole("textbox", { name: "Reps" }), "12");
    fireEvent.click(screen.getByRole("button", { name: /Edit set 1/ }));
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("8");

    fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("12");
  });

  it("opens the collapsed row to edit a set", () => {
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={2}
        loggedSets={[set(1), set(2)]}
        onEdit={vi.fn()}
      />,
    );
    // The card is finished, so the row is collapsed.
    expect(screen.queryByRole("textbox", { name: "Reps" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Edit set 1/ }));
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("8");
  });

  it("stays in editing mode when the values are invalid", async () => {
    const onEdit = vi.fn();
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1)]}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit set 1/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Reps" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Reps" }), "0");
    fireEvent.click(screen.getByRole("button", { name: "Save set" }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Reps must be at least 1.");
    expect(screen.getByText("Editing set 1")).toBeInTheDocument();
  });

  it("cancels the edit if that set gets deleted", () => {
    const { rerender } = render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1), set(2)]}
        onEdit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit set 2/ }));
    expect(screen.getByText("Editing set 2")).toBeInTheDocument();

    // The set under edit is gone, so there is nothing left to save into.
    rerender(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1)]}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.queryByText("Editing set 2")).toBeNull();
    expect(screen.getByRole("button", { name: "Log set" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("");
  });

  // The delete X is already a 44 by 44 button inside the row. Wrapping the row
  // in a button to make it tappable would nest one button inside another.
  it("puts the edit control beside the delete button, not around it", () => {
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={3}
        loggedSets={[set(1)]}
        onEdit={vi.fn()}
      />,
    );
    const edit = screen.getByRole("button", { name: /Edit set 1/ });
    const del = screen.getByRole("button", { name: "Delete set 1" });
    expect(edit.contains(del)).toBe(false);
    expect(del.contains(edit)).toBe(false);
  });

  it("is not offered on a read only card", () => {
    render(
      <ExerciseLogCard
        {...base}
        defaultSets={0}
        role="swappedOutOriginal"
        loggedSets={[set(1)]}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Edit set 1/ })).toBeNull();
  });
});
