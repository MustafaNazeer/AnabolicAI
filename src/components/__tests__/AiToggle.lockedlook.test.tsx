import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { AiToggle } from "@/components/AiToggle";

const props = {
  label: "AI quick entry",
  description: "Turns typed set descriptions into sets.",
  save: vi.fn(),
};

describe("how a locked AI row looks", () => {
  // Dimmed the same way a busy row is, so a row that cannot be used looks like
  // one. WCAG 1.4.3 exempts text that is part of an inactive component from the
  // contrast requirement, and a locked row is fully disabled in both
  // directions, so this is not the contrast trade the approval lock would be:
  // that one leaves the row usable in the off direction.
  it("dims the row while locked", () => {
    render(<AiToggle {...props} initial={false} locked />);
    expect(screen.getByRole("checkbox").closest("label")).toHaveStyle({
      opacity: "0.5",
    });
  });

  it("does not dim a row that is merely unapproved", () => {
    render(<AiToggle {...props} initial={true} approved={false} />);
    expect(screen.getByRole("checkbox").closest("label")).toHaveStyle({
      opacity: "1",
    });
  });

  // The description explains what the feature does and what it sends. With the
  // feature gone from the app there is nothing for it to describe, and three of
  // them stacked under the switch that just removed them is the clutter this
  // whole feature exists to clear.
  it("drops the description while locked", () => {
    render(<AiToggle {...props} initial={false} locked />);
    expect(screen.queryByText(props.description)).toBeNull();
  });

  it("shows the description again when not locked", () => {
    render(<AiToggle {...props} initial={false} />);
    expect(screen.getByText(props.description)).toBeInTheDocument();
  });

  // Invisible, not absent. A disabled checkbox with no announced reason is a
  // dead control to a screen reader user, which is the finding the open signup
  // review raised against the approval lock, so the explanation stays in the
  // page and stays associated with the input.
  it("keeps the reason for screen readers while hiding it on screen", () => {
    render(<AiToggle {...props} initial={false} locked />);
    const reason = screen.getByText(/show ai features/i);
    expect(reason).toBeInTheDocument();
    expect(reason).toHaveClass("sr-only");
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-describedby",
      reason.id,
    );
  });

  // The approval notice is the one case where the row is still usable, so its
  // explanation has to stay visible: the user can act on it.
  it("keeps the approval notice visible", () => {
    render(<AiToggle {...props} initial={false} approved={false} />);
    const notice = screen.getByText(/waiting to be approved/i);
    expect(notice).toBeInTheDocument();
    expect(notice).not.toHaveClass("sr-only");
  });

  it("has no accessibility violations while locked", async () => {
    const { container } = render(<AiToggle {...props} initial={true} locked />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
