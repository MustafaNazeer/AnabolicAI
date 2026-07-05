import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { AppearanceControl } from "@/components/AppearanceControl";

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    media: "(prefers-color-scheme: dark)",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
});

function renderControl() {
  return render(
    <AppearanceProvider>
      <AppearanceControl />
    </AppearanceProvider>,
  );
}

describe("AppearanceControl", () => {
  it("shows the three appearance options", () => {
    const { getByRole } = renderControl();
    expect(getByRole("tab", { name: "System" })).toBeTruthy();
    expect(getByRole("tab", { name: "Light" })).toBeTruthy();
    expect(getByRole("tab", { name: "Dark" })).toBeTruthy();
  });

  it("persists the chosen mode", () => {
    const { getByRole } = renderControl();
    fireEvent.click(getByRole("tab", { name: "Light" }));
    expect(localStorage.getItem("onyx-mode")).toBe("light");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });
});
