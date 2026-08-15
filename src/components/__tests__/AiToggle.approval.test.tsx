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
});
