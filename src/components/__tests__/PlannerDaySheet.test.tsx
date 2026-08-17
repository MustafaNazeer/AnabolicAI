import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { saveMock } = vi.hoisted(() => ({
  saveMock: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("@/lib/planner/dayActions", () => ({ savePlannerDay: saveMock }));

import { PlannerDaySheet } from "@/components/PlannerDaySheet";

// Cardio is in the fixture because the planning test picks it. The plan's own
// copy of this file omitted it and its third test would have failed on a
// missing button rather than on the behaviour it is about.
const categories = [
  { id: "c1", name: "Lower Body" },
  { id: "c2", name: "Abs" },
  { id: "c3", name: "Rest" },
  { id: "c4", name: "Cardio" },
];

beforeEach(() => vi.clearAllMocks());

describe("PlannerDaySheet", () => {
  it("sends every label that was picked", async () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Lower Body" }));
    await userEvent.click(screen.getByRole("button", { name: "Abs" }));
    await userEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(saveMock).toHaveBeenCalledWith("2026-08-11", ["c1", "c2"]);
  });

  // Rest is an ordinary label. She chose to allow any combination, so nothing
  // here refuses rest beside a real workout and nothing warns about it.
  it("allows rest alongside a workout", async () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rest" }));
    await userEvent.click(screen.getByRole("button", { name: "Lower Body" }));
    await userEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(saveMock).toHaveBeenCalledWith("2026-08-11", ["c3", "c1"]);
  });

  // ONE BUTTON ONLY. Whether a day counts as trained is decided by the date in
  // savePlannerDay, so a second button asking the user to restate the calendar
  // is gone, and with it the ability to record a future day as trained.
  it("offers one save button and no separate way to plan", async () => {
    render(
      <PlannerDaySheet day="2026-08-20" categories={categories} initial={null} onDone={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Plan it" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cardio" }));
    await userEvent.click(screen.getByRole("button", { name: "Log it" }));
    // Two arguments, never three: the sheet does not get a say in done.
    expect(saveMock).toHaveBeenCalledWith("2026-08-20", ["c4"]);
    expect(saveMock.mock.calls[0]).toHaveLength(2);
  });

  // Opening a day that already has labels has to show them already picked, or
  // saving it again silently drops whatever is not re-tapped. That is the same
  // "replace the plan" rule turning into data loss at the interface.
  it("starts with the day's existing labels already picked", async () => {
    render(
      <PlannerDaySheet
        day="2026-08-11"
        categories={categories}
        initial={{ day: "2026-08-11", done: true, categories: ["c2"] }}
        onDone={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Abs" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Lower Body" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await userEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(saveMock).toHaveBeenCalledWith("2026-08-11", ["c2"]);
  });

  // Adding a category has to be reachable from where the labels are chosen. On
  // its own screen it would be a control she has to know exists, and the chips
  // are the only place their absence is visible.
  it("offers a way to add a category from inside the sheet", () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    expect(screen.getByLabelText(/new category/i)).toBeInTheDocument();
  });

  it("closes only after the save succeeds", async () => {
    const onDone = vi.fn();
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={onDone} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rest" }));
    await userEvent.click(screen.getByRole("button", { name: "Log it" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  // A failed save must not close the sheet and lose what was picked, and it has
  // to say so. Every other write surface in this app does the same.
  it("keeps the sheet open and says so when the save fails", async () => {
    saveMock.mockResolvedValueOnce({ error: "Network is down." } as never);
    const onDone = vi.fn();
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={onDone} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rest" }));
    await userEvent.click(screen.getByRole("button", { name: "Log it" }));

    expect(await screen.findByText(/Network is down\./)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
