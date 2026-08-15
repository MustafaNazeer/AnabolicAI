import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiToggle } from "@/components/AiToggle";

describe("AiToggle approval lock", () => {
  it("renders the toggle disabled with an explanation when unapproved", () => {
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={false}
        save={vi.fn()}
        approved={false}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByText(/waiting to be approved/i)).toBeInTheDocument();
  });

  // The lock is one directional, because the three save actions are. Each of
  // them gates enabling only, so that an account whose approval was revoked
  // while a feature was on can still withdraw that consent: revoke deliberately
  // leaves the consent columns alone. A lock in both directions would leave the
  // switch checked and frozen, with no way to turn it off anywhere in the app.
  it("still lets an unapproved account turn a feature that is on back off", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={true}
        save={save}
        approved={false}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeEnabled();
    await userEvent.click(checkbox);
    await waitFor(() => expect(save).toHaveBeenCalledWith(false));
    expect(checkbox).not.toBeChecked();
  });

  // The other half, and the one the lock exists for. Once off, an unapproved
  // account cannot turn it back on, which is exactly what the save actions
  // would refuse anyway.
  it("does not let an unapproved account turn a feature that is off back on", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={false}
        save={save}
        approved={false}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    await userEvent.click(checkbox);
    expect(save).not.toHaveBeenCalled();
    expect(checkbox).not.toBeChecked();
  });

  // Turning it off is the last move an unapproved account can make on this
  // row: having withdrawn consent, it is locked out of granting it again.
  it("locks the toggle again once an unapproved account has turned it off", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={true}
        save={save}
        approved={false}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeDisabled());
  });

  it("leaves the toggle usable when approved", () => {
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={false}
        save={vi.fn()}
        approved
      />,
    );
    expect(screen.getByRole("checkbox")).toBeEnabled();
    expect(screen.queryByText(/waiting to be approved/i)).not.toBeInTheDocument();
  });

  it("leaves the toggle usable when approved is omitted", () => {
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={false}
        save={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeEnabled();
    expect(screen.queryByText(/waiting to be approved/i)).not.toBeInTheDocument();
  });

  // A screen reader user must hear why a disabled control is disabled, not
  // just that it is dimmed. The aria label already overrides the label
  // element's text as the accessible name, so the explanation only reaches
  // assistive technology through aria-describedby.
  it("exposes the explanation as the accessible description when unapproved", () => {
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={false}
        save={vi.fn()}
        approved={false}
      />,
    );
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(
      "This account is waiting to be approved.",
    );
  });

  it("leaves the accessible description empty when approved", () => {
    render(
      <AiToggle
        label="AI quick entry"
        description="Turns typed set descriptions into sets."
        initial={false}
        save={vi.fn()}
        approved
      />,
    );
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription("");
  });
});
