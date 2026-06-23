import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, it, expect } from "vitest";
import { Skeleton } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("is decorative (aria-hidden) and has no axe violations", async () => {
    const { container } = render(<Skeleton style={{ height: 40 }} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(await axe(container)).toHaveNoViolations();
  });
});
