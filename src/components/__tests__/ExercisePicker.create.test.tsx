import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { createExerciseMock } = vi.hoisted(() => ({
  createExerciseMock: vi.fn(),
}));

vi.mock("@/lib/data/actions", () => ({
  createExercise: createExerciseMock,
  updateExercise: vi.fn(),
}));

import { ExercisePicker } from "@/components/ExercisePicker";
import type { Exercise } from "@/lib/data/types";

const LIBRARY: Exercise[] = [
  {
    id: "d1",
    name: "Bench Press",
    muscle_group: "Chest",
    equipment: "Barbell",
    is_default: true,
  },
];

function setup() {
  const onCreated = vi.fn();
  render(
    <ExercisePicker
      library={LIBRARY}
      onAdd={vi.fn()}
      onCreated={onCreated}
      onUpdated={vi.fn()}
      takenIds={new Set<string>()}
    />,
  );
  return { onCreated };
}

beforeEach(() => {
  vi.clearAllMocks();
  createExerciseMock.mockResolvedValue({
    exercise: {
      id: "c1",
      name: "Pec Deck",
      muscle_group: "Chest",
      equipment: "Machine",
      is_default: false,
    },
  });
});

describe("ExercisePicker creation", () => {
  it("opens the form with the typed name already filled in", async () => {
    setup();
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Pec Deck",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));
    expect(screen.getByRole("textbox", { name: "Exercise name" })).toHaveValue(
      "Pec Deck",
    );
  });

  // The zero tap case, and the reason requiring both fields is not a burden:
  // you filtered to Chest and Machine, found nothing, so that is the answer.
  it("pre-fills the chips from the active filters", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Chest" }));
    await userEvent.click(screen.getByRole("button", { name: "Machine" }));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Pec Deck",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));

    expect(screen.getByRole("radio", { name: "Chest" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Machine" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Create exercise" })).toBeEnabled();
  });

  it("leaves the chips empty when no filter is active", async () => {
    setup();
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Pec Deck",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeDisabled();
  });

  it("sends both values to the action and hands back the new exercise", async () => {
    const { onCreated } = setup();
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Pec Deck",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Create exercise" }));

    expect(createExerciseMock).toHaveBeenCalledWith(
      "Pec Deck",
      "Chest",
      "Machine",
    );
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Pec Deck" }),
    );
  });

  it("shows the action's error and keeps the form open for a retry", async () => {
    createExerciseMock.mockResolvedValue({ error: "Pick a muscle group." });
    const { onCreated } = setup();
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Pec Deck",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Create exercise" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pick a muscle group.",
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "Exercise name" }),
    ).toBeInTheDocument();
  });

  it("closes the form on cancel without calling the action", async () => {
    setup();
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Pec Deck",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(createExerciseMock).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("textbox", { name: "Exercise name" }),
    ).not.toBeInTheDocument();
  });
});
