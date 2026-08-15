import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import type { Account } from "@/lib/accounts/admin";

const { approveAccountMock, revokeAccountMock } = vi.hoisted(() => ({
  approveAccountMock: vi.fn(),
  revokeAccountMock: vi.fn(),
}));

vi.mock("@/lib/accounts/actions", () => ({
  approveAccount: approveAccountMock,
  revokeAccount: revokeAccountMock,
}));

import { AccountList } from "@/components/AccountList";

const approvedAccount: Account = {
  id: "u1",
  email: "approved@onyx.app",
  createdAt: "2026-08-01T00:00:00.000Z",
  approved: true,
};

const pendingAccount: Account = {
  id: "u2",
  email: "pending@onyx.app",
  createdAt: "2026-08-10T00:00:00.000Z",
  approved: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  approveAccountMock.mockResolvedValue({ ok: true });
  revokeAccountMock.mockResolvedValue({ ok: true });
});

describe("AccountList", () => {
  it("lists unapproved accounts first and offers the right action", () => {
    render(<AccountList accounts={[approvedAccount, pendingAccount]} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName(/approve/i);
  });

  it("shows each account's email and state", () => {
    render(<AccountList accounts={[approvedAccount, pendingAccount]} />);
    expect(screen.getByText("approved@onyx.app")).toBeInTheDocument();
    expect(screen.getByText("pending@onyx.app")).toBeInTheDocument();
    expect(screen.getByText(/waiting for approval/i)).toBeInTheDocument();
  });

  it("says so when nobody has signed up", () => {
    render(<AccountList accounts={[]} />);
    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
  });

  it("approves a pending account through the action", async () => {
    render(<AccountList accounts={[pendingAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect(approveAccountMock).toHaveBeenCalledWith("u2"));
    expect(
      await screen.findByRole("button", { name: /revoke/i }),
    ).toBeInTheDocument();
  });

  it("revokes an approved account through the action", async () => {
    render(<AccountList accounts={[approvedAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    await waitFor(() => expect(revokeAccountMock).toHaveBeenCalledWith("u1"));
    expect(
      await screen.findByRole("button", { name: /approve/i }),
    ).toBeInTheDocument();
  });

  it("surfaces the error and keeps the prior state when the action fails", async () => {
    revokeAccountMock.mockResolvedValue({ error: "connection refused" });
    render(<AccountList accounts={[approvedAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    expect(await screen.findByText(/connection refused/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /revoke/i }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<AccountList accounts={[pendingAccount]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations with an error shown", async () => {
    revokeAccountMock.mockResolvedValue({ error: "connection refused" });
    const { container } = render(<AccountList accounts={[approvedAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    await screen.findByText(/connection refused/i);
    expect(await axe(container)).toHaveNoViolations();
  });
});
