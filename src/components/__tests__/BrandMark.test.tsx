import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandMark } from "../BrandMark";
import { appName } from "@/lib/app";

describe("BrandMark", () => {
  it("renders an accessible image with the AnabolicAI label", () => {
    const { getByRole } = render(<BrandMark />);
    const el = getByRole("img", { name: appName });
    expect(el).toBeInTheDocument();
  });

  it("applies the requested pixel size", () => {
    const { getByRole } = render(<BrandMark size={120} />);
    const el = getByRole("img", { name: appName });
    expect(el).toHaveAttribute("width", "120");
    expect(el).toHaveAttribute("height", "120"); // the mark is square
  });

  it("renders the mono variant from currentColor, not the accent", () => {
    const { container } = render(<BrandMark variant="mono" />);
    expect(container.innerHTML).toContain("currentColor");
    expect(container.innerHTML).not.toContain("var(--accent)");
  });

  it("renders the lit variant from the theme accent", () => {
    // This is what makes the sign in mark follow the user's chosen accent
    // instead of being pinned to whichever one happened to be the default.
    const { container } = render(<BrandMark />);
    expect(container.innerHTML).toContain("var(--accent)");
  });
});
