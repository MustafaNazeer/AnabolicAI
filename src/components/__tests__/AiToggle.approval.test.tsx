import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
