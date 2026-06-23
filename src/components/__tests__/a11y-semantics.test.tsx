import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, it, expect, vi } from "vitest";
import { BottomTabs } from "@/components/BottomTabs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("navigation semantics", () => {
  it("labels the bottom nav and marks the active tab", () => {
    render(<BottomTabs />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("labels the segmented control tablist and has no axe violations", async () => {
    const { container } = render(
      <SegmentedControl
        label="Activity metric"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("tablist", { name: "Activity metric" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
