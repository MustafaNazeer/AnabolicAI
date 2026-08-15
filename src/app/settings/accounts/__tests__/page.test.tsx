import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  getVerifiedUserMock,
  listAccountsMock,
  getNotifNewAccountMock,
  redirectMock,
} = vi.hoisted(() => ({
  getVerifiedUserMock: vi.fn(),
  listAccountsMock: vi.fn(),
  getNotifNewAccountMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/accounts/admin", () => ({ listAccounts: listAccountsMock }));
vi.mock("@/lib/accounts/queries", () => ({
  getNotifNewAccount: getNotifNewAccountMock,
}));
vi.mock("@/lib/accounts/actions", () => ({
  setNewAccountNotification: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import AccountsPage from "@/app/settings/accounts/page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
  listAccountsMock.mockResolvedValue([]);
  getNotifNewAccountMock.mockResolvedValue(true);
});

// The redirect is the only thing standing between a signed in stranger and
// every account's email, read through the admin API. Pinned in both
// directions, matching the createAdminClientMock).not.toHaveBeenCalled()
// pattern already proven in actions.test.ts: the assertion that
// listAccounts was never called is the one that matters, because it is the
// one that fails if the read is ever reordered ahead of the check.
describe("the accounts page", () => {
  it("redirects a non admin to settings without ever reading the accounts", async () => {
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "stranger@c.com" });
    await expect(AccountsPage()).rejects.toThrow("NEXT_REDIRECT:/settings");
    expect(redirectMock).toHaveBeenCalledWith("/settings");
    expect(listAccountsMock).not.toHaveBeenCalled();
  });

  it("redirects a signed out visitor without ever reading the accounts", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(AccountsPage()).rejects.toThrow("NEXT_REDIRECT:/settings");
    expect(listAccountsMock).not.toHaveBeenCalled();
  });

  it("renders the account list for an admin and never redirects", async () => {
    getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "boss@b.com" });
    listAccountsMock.mockResolvedValue([
      {
        id: "u2",
        email: "a@b.com",
        createdAt: "2026-08-01T00:00:00.000Z",
        approved: false,
      },
    ]);
    render(await AccountsPage());
    expect(redirectMock).not.toHaveBeenCalled();
    expect(listAccountsMock).toHaveBeenCalled();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });

  // The second control the list was deliberately composed to sit beside.
  it("renders the new account notification toggle for an admin", async () => {
    getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "boss@b.com" });
    render(await AccountsPage());
    expect(getNotifNewAccountMock).toHaveBeenCalled();
    expect(
      screen.getByRole("checkbox", { name: /new account/i }),
    ).toBeInTheDocument();
  });
});
