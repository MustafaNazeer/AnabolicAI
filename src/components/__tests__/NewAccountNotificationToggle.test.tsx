import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setNewAccountNotificationMock } = vi.hoisted(() => ({
  setNewAccountNotificationMock: vi.fn(),
}));

vi.mock("@/lib/accounts/actions", () => ({
  setNewAccountNotification: setNewAccountNotificationMock,
}));

import { NewAccountNotificationToggle } from "@/components/NewAccountNotificationToggle";

beforeEach(() => {
  vi.clearAllMocks();
  setNewAccountNotificationMock.mockResolvedValue({ ok: true });
});

describe("NewAccountNotificationToggle", () => {
  it("renders the saved preference", () => {
    render(<NewAccountNotificationToggle initial={false} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("persists a change through the action", async () => {
    render(<NewAccountNotificationToggle initial={false} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(setNewAccountNotificationMock).toHaveBeenCalledWith(true);
  });

  it("reverts the switch when the save fails", async () => {
    setNewAccountNotificationMock.mockResolvedValue({ error: "nope" });
    render(<NewAccountNotificationToggle initial={false} />);
    const box = screen.getByRole("checkbox");
    await userEvent.click(box);
    await waitFor(() => expect(box).not.toBeChecked());
  });
});
