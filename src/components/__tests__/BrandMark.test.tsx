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
    expect(el).toHaveAttribute("height", "140"); // preserves 120x140 aspect
  });

  it("renders the mono variant without the cobalt gradient fill", () => {
    const { container } = render(<BrandMark variant="mono" />);
    expect(container.innerHTML).toContain("currentColor");
    expect(container.innerHTML).not.toContain("#3b82f6");
  });
});
