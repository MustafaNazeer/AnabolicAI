import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { AiToggle } from "@/components/AiToggle";

const props = {
  label: "AI quick entry",
  description: "Turns typed set descriptions into sets.",
  save: vi.fn(),
};

describe("AiToggle lock while the features are hidden", () => {
  it("disables the row when the features are hidden", () => {
    render(<AiToggle {...props} initial={false} locked />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  // THE DELIBERATE DIFFERENCE FROM THE APPROVAL LOCK, which is one directional
  // precisely so a revoked account can still withdraw consent it already gave.
  // This one holds in both directions, and it is safe here for a reason that
  // does not apply there: the only three Anthropic call sites in the app are
  // the three server actions, each reached by a tap on a surface this switch
  // has removed. Nothing can be sent while the features are hidden whatever the
  // consent flags say, so a consent that cannot be withdrawn until the features
  // are shown again is a formality rather than a live privacy gap.
  it("also refuses to turn a feature that is on back off", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render(<AiToggle {...props} save={save} initial={true} locked />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    await userEvent.click(checkbox);
    expect(save).not.toHaveBeenCalled();
  });

  // A disabled control with no announced reason is a dead checkbox to a screen
  // reader user. This is the same finding the approval lock had to fix, and it
  // is why aria-label alone is not enough: it overrides the wrapping label, so
  // the explanation has to be pointed at deliberately.
  it("says why, and associates the reason with the control", () => {
    render(<AiToggle {...props} initial={false} locked />);
    const explanation = screen.getByText(/show ai features/i);
    expect(explanation).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-describedby",
      explanation.id,
    );
  });

  // Hidden is the state the user just chose and can undo in one tap, so it is
  // the message that helps. The approval notice would tell them to wait for
  // something that is not actually in their way.
  it("prefers the hidden reason over the approval one when both apply", () => {
    render(<AiToggle {...props} initial={false} locked approved={false} />);
    expect(screen.getByText(/show ai features/i)).toBeInTheDocument();
    expect(screen.queryByText(/waiting to be approved/i)).toBeNull();
  });

  it("is unaffected when not locked", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    render(<AiToggle {...props} save={save} initial={false} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(save).toHaveBeenCalledWith(true));
  });

  it("has no accessibility violations while locked", async () => {
    const { container } = render(<AiToggle {...props} initial={true} locked />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
