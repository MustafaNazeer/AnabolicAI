import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setWeekPlannerMock } = vi.hoisted(() => ({
  setWeekPlannerMock: vi.fn(async (): Promise<{ ok: true } | { error: string }> => ({
    ok: true,
  })),
}));

vi.mock("@/lib/planner/actions", () => ({ setWeekPlanner: setWeekPlannerMock }));

import { WeekPlannerToggle } from "@/components/WeekPlannerToggle";

beforeEach(() => {
  vi.clearAllMocks();
  setWeekPlannerMock.mockResolvedValue({ ok: true });
});

describe("WeekPlannerToggle", () => {
  it("starts from the flag the account already holds", () => {
    render(<WeekPlannerToggle initial={true} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  // The row reuses the shared toggle, whose save prop is just a function, so
  // nothing but this assertion stops it being wired to a different settings
  // action that would happily accept the same boolean.
  it("saves through setWeekPlanner", async () => {
    render(<WeekPlannerToggle initial={false} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(setWeekPlannerMock).toHaveBeenCalledWith(true));
  });

  it("turns itself back off through the same action", async () => {
    render(<WeekPlannerToggle initial={true} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(setWeekPlannerMock).toHaveBeenCalledWith(false));
  });
});
