import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { saveMock, hideMock, clearMock } = vi.hoisted(() => ({
  saveMock: vi.fn(async () => ({ ok: true as const })),
  hideMock: vi.fn(async () => ({ ok: true as const })),
  clearMock: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("@/lib/planner/dayActions", () => ({
  savePlannerDay: saveMock,
  clearPlannerDay: clearMock,
}));
vi.mock("@/lib/planner/categoryActions", () => ({
  addPlannerCategory: vi.fn(async () => ({ ok: true as const })),
  hidePlannerCategory: hideMock,
}));

import { PlannerDaySheet } from "@/components/PlannerDaySheet";

// Cardio is in the fixture because the planning test picks it. The plan's own
// copy of this file omitted it and its third test would have failed on a
// missing button rather than on the behaviour it is about.
const categories = [
  { id: "c1", name: "Lower Body", hidden: false },
  { id: "c2", name: "Abs", hidden: false },
  { id: "c3", name: "Rest", hidden: false },
  { id: "c4", name: "Cardio", hidden: false },
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

// Removing a chip is a hide, not a delete, and it is behind an Edit toggle.
// The chips are tap targets used constantly, so an always visible remove
// control would sit a destructive action a few pixels from an ordinary one.
describe("PlannerDaySheet, removing a chip", () => {
  it("offers no remove control until Edit is tapped", () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /remove lower body/i })).toBeNull();
  });

  it("removes the chip that was tapped while editing", async () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove lower body/i }));
    expect(hideMock).toHaveBeenCalledWith("c1");
  });

  // A seeded chip is removable too, which is the whole point of the request.
  // Nothing in the interface treats the six differently from her own.
  it("removes a seeded chip just as readily as a custom one", async () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove rest/i }));
    expect(hideMock).toHaveBeenCalledWith("c3");
  });

  // THE ASSERTION THAT KEEPS THE TWO MODES APART. A tap while editing must not
  // also select the label, or removing a chip would quietly add it to the day
  // being saved.
  it("does not select a chip that was tapped while editing", async () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove abs/i }));

    await userEvent.click(screen.getByRole("button", { name: /^done$/i }));
    await userEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(saveMock).toHaveBeenCalledWith("2026-08-11", []);
  });
});

describe("PlannerDaySheet, the chip row and cancelling", () => {
  // The chips are a single row that scrolls sideways rather than wrapping onto
  // more lines, so the sheet keeps one height however many labels exist. Each
  // chip must refuse to shrink, or a long list squeezes every name unreadable
  // instead of running off the edge to be scrolled to.
  it("lays the chips out as one sideways scrolling row", () => {
    const { container } = render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    const row = container.querySelector("[data-chip-scroller]");
    expect(row).not.toBeNull();
    expect(row?.className).toContain("overflow-x-auto");
    expect(row?.className).not.toContain("flex-wrap");
    expect(screen.getByRole("button", { name: "Lower Body" }).className).toContain(
      "shrink-0",
    );
  });

  // Opening a day and changing nothing has to be possible. Without this the
  // only way out of the sheet is to save, so a tap on the wrong day writes a
  // row that was never wanted.
  it("closes without writing anything when cancelled", async () => {
    const onDone = vi.fn();
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={onDone} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Lower Body" }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onDone).toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });
});

describe("PlannerDaySheet, undoing a day", () => {
  // Offered only where there is something to undo. On a day with no row it
  // would be a destructive looking control that does nothing, sitting next to
  // one that does.
  it("offers no undo on a day that was never logged", () => {
    render(
      <PlannerDaySheet day="2026-08-11" categories={categories} initial={null} onDone={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /undo/i })).toBeNull();
  });

  it("offers undo on a day that already has a row", () => {
    render(
      <PlannerDaySheet
        day="2026-08-11"
        categories={categories}
        initial={{ day: "2026-08-11", done: true, categories: ["c1"] }}
        onDone={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("clears the day and closes, without writing a save", async () => {
    const onDone = vi.fn();
    render(
      <PlannerDaySheet
        day="2026-08-11"
        categories={categories}
        initial={{ day: "2026-08-11", done: true, categories: ["c1"] }}
        onDone={onDone}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /undo/i }));

    expect(clearMock).toHaveBeenCalledWith("2026-08-11");
    expect(saveMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  // Same rule as every other write here: a failure keeps the sheet open and
  // says so, rather than closing over a day that is still there.
  it("keeps the sheet open and says so when the undo fails", async () => {
    clearMock.mockResolvedValueOnce({ error: "Network is down." } as never);
    const onDone = vi.fn();
    render(
      <PlannerDaySheet
        day="2026-08-11"
        categories={categories}
        initial={{ day: "2026-08-11", done: true, categories: ["c1"] }}
        onDone={onDone}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /undo/i }));

    expect(await screen.findByText(/Network is down\./)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
