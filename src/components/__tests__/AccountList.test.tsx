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

  // A server action does not only resolve with an error, it can reject: a
  // dropped connection, or createAdminClient throwing when the service role
  // key is unset. Awaiting it without a catch left the row dimmed and disabled
  // for good, said nothing, and produced an unhandled rejection because the
  // caller does not await the handler either.
  it("recovers the row and says so when the action rejects", async () => {
    revokeAccountMock.mockRejectedValue(new Error("connection reset"));
    render(<AccountList accounts={[approvedAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not reach the server/i,
    );
    const button = screen.getByRole("button", { name: /revoke/i });
    await waitFor(() => expect(button).toBeEnabled());
    expect(button.closest("li")).toHaveStyle({ opacity: "1" });
  });

  // The row still works afterwards, which is the point of recovering it.
  it("lets the row be retried after a rejection", async () => {
    revokeAccountMock.mockRejectedValueOnce(new Error("connection reset"));
    render(<AccountList accounts={[approvedAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    expect(
      await screen.findByRole("button", { name: /approve/i }),
    ).toBeInTheDocument();
    expect(revokeAccountMock).toHaveBeenCalledTimes(2);
  });

  // The list held the server data in useState with a lazy initialiser, so it
  // was frozen at mount. approveAccount and revokeAccount both call
  // revalidatePath("/settings/accounts"), which sends fresh props down, and
  // every one of them was discarded. The screen this matters on is the one an
  // admin sits on waiting for exactly that: a signup landing while the page is
  // open never appeared until a remount.
  it("takes an account that arrives from the server while the page is open", () => {
    const { rerender } = render(<AccountList accounts={[approvedAccount]} />);
    expect(screen.queryByText("pending@onyx.app")).not.toBeInTheDocument();

    rerender(<AccountList accounts={[approvedAccount, pendingAccount]} />);
    expect(screen.getByText("pending@onyx.app")).toBeInTheDocument();
    expect(screen.getAllByRole("button")[0]).toHaveAccessibleName(/approve/i);
  });

  // The local optimistic update is still what moves the row on a tap, so fresh
  // props must not be needed for the button to change.
  it("still moves the row on a tap without waiting for new props", async () => {
    render(<AccountList accounts={[pendingAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(
      await screen.findByRole("button", { name: /revoke/i }),
    ).toBeInTheDocument();
  });

  // Every other best effort catch this feature wrote logs what it swallowed.
  // This one said nothing, so a rejection that the user saw as a generic
  // "could not reach the server" left no trace to diagnose it from.
  it("logs the rejection rather than swallowing it silently", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    revokeAccountMock.mockRejectedValue(new Error("connection reset"));
    render(<AccountList accounts={[approvedAccount]} />);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    await screen.findByRole("alert");

    expect(logged).toHaveBeenCalledWith(
      "account action threw",
      expect.objectContaining({ accountId: "u1" }),
    );
    logged.mockRestore();
  });

  // A live region is announced reliably only when assistive technology was
  // already watching it as the content arrived. Mounting the node together with
  // its text is the case screen readers handle inconsistently, and jest-axe
  // cannot catch it because the markup is valid either way.
  it("keeps the live region mounted before there is anything to announce", () => {
    render(<AccountList accounts={[approvedAccount]} />);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  // Between the tap and the result the row signalled only through opacity and a
  // disabled button, neither of which a screen reader reports, so there was no
  // way to tell a request in flight from one that had done nothing.
  it("marks the row busy while its action is in flight", async () => {
    let finish: (result: { ok: true }) => void = () => {};
    revokeAccountMock.mockReturnValue(
      new Promise<{ ok: true }>((resolve) => {
        finish = resolve;
      }),
    );
    render(<AccountList accounts={[approvedAccount]} />);
    const row = screen.getByRole("button", { name: /revoke/i }).closest("li");
    expect(row).toHaveAttribute("aria-busy", "false");

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    await waitFor(() => expect(row).toHaveAttribute("aria-busy", "true"));

    finish({ ok: true });
    await waitFor(() => expect(row).toHaveAttribute("aria-busy", "false"));
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
