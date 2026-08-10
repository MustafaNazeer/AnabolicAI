import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { setAiQuickEntryMock } = vi.hoisted(() => ({
  setAiQuickEntryMock: vi.fn(),
}));
vi.mock("@/lib/ai/actions", () => ({ setAiQuickEntry: setAiQuickEntryMock }));

import { AiQuickEntryToggle } from "@/components/AiQuickEntryToggle";

beforeEach(() => {
  vi.clearAllMocks();
  setAiQuickEntryMock.mockResolvedValue({ ok: true });
});

describe("AiQuickEntryToggle", () => {
  it("renders checked from the server value", () => {
    render(<AiQuickEntryToggle initial={true} />);
    expect(
      screen.getByRole("checkbox", { name: /ai quick entry/i }),
    ).toBeChecked();
  });

  it("persists a change through the action", async () => {
    render(<AiQuickEntryToggle initial={false} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /ai quick entry/i }));
    await waitFor(() => expect(setAiQuickEntryMock).toHaveBeenCalledWith(true));
    expect(
      screen.getByRole("checkbox", { name: /ai quick entry/i }),
    ).toBeChecked();
  });

  it("reverts the optimistic state when the action fails", async () => {
    setAiQuickEntryMock.mockResolvedValue({ error: "boom" });
    render(<AiQuickEntryToggle initial={false} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /ai quick entry/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /ai quick entry/i }),
      ).not.toBeChecked(),
    );
  });

  // Turning it off is the half that matters for consent: the notice can only
  // ever turn it on, so this switch is the only way back.
  it("can turn consent back off", async () => {
    render(<AiQuickEntryToggle initial={true} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /ai quick entry/i }));
    await waitFor(() => expect(setAiQuickEntryMock).toHaveBeenCalledWith(false));
    expect(
      screen.getByRole("checkbox", { name: /ai quick entry/i }),
    ).not.toBeChecked();
  });
});
