import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomTabs } from "@/components/BottomTabs";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("BottomTabs", () => {
  it("renders all five primary destinations as links", () => {
    render(<BottomTabs />);
    for (const label of ["Home", "Routines", "Log", "Progress", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
