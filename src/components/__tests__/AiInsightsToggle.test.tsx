import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setAiInsightsMock } = vi.hoisted(() => ({
  setAiInsightsMock: vi.fn(),
}));

vi.mock("@/lib/ai/insights/actions", () => ({
  setAiInsights: setAiInsightsMock,
}));

import { AiInsightsToggle } from "@/components/AiInsightsToggle";

beforeEach(() => {
  vi.clearAllMocks();
  setAiInsightsMock.mockResolvedValue({ ok: true });
});

describe("AiInsightsToggle", () => {
  it("renders off and names what it sends", () => {
    render(<AiInsightsToggle initial={false} />);
    expect(
      screen.getByRole("checkbox", { name: "Weekly insights" }),
    ).not.toBeChecked();
    expect(
      screen.getByText(/five most recently trained lifts/i),
    ).toBeInTheDocument();
  });

  it("persists a change through the action", async () => {
    render(<AiInsightsToggle initial={false} />);
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Weekly insights" }),
    );
    expect(setAiInsightsMock).toHaveBeenCalledWith(true);
  });

  it("reverts the switch when the save fails", async () => {
    setAiInsightsMock.mockResolvedValue({ error: "nope" });
    render(<AiInsightsToggle initial={false} />);
    const box = screen.getByRole("checkbox", { name: "Weekly insights" });
    await userEvent.click(box);
    await waitFor(() => expect(box).not.toBeChecked());
  });
});
