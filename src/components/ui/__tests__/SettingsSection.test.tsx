import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { runViewTransitionMock } = vi.hoisted(() => ({ runViewTransitionMock: vi.fn() }));

// jsdom implements no startViewTransition, so the real helper silently takes
// its fallback branch and an inert animation is indistinguishable from a
// working one. Asserting the helper was called is the only part of the motion
// jsdom can see, and it is exactly what the rest duration picker shipped
// without on 2026-08-04: the class was on the markup, nothing routed through
// the helper, and the panel snapped open with a green suite.
vi.mock("@/lib/motion/viewTransition", () => ({
  runViewTransition: (update: () => void) => {
    runViewTransitionMock();
    update();
  },
}));

import { SettingsSection } from "@/components/ui/SettingsSection";

beforeEach(() => runViewTransitionMock.mockReset());

describe("SettingsSection", () => {
  it("starts collapsed, with the content absent rather than merely hidden", () => {
    render(
      <SettingsSection title="Notifications">
        <p>inner content</p>
      </SettingsSection>,
    );
    expect(screen.queryByText("inner content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notifications/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reveals the content when tapped", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="Notifications">
        <p>inner content</p>
      </SettingsSection>,
    );
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("inner content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notifications/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("collapses again on a second tap", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="Export">
        <p>inner content</p>
      </SettingsSection>,
    );
    const header = screen.getByRole("button", { name: /Export/ });
    await user.click(header);
    await user.click(header);
    expect(screen.queryByText("inner content")).not.toBeInTheDocument();
  });

  it("routes the toggle through the motion helper", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="AI">
        <p>inner content</p>
      </SettingsSection>,
    );
    await user.click(screen.getByRole("button", { name: /AI/ }));
    expect(runViewTransitionMock).toHaveBeenCalledTimes(1);
  });

  it("points the header at the panel it controls", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="Export">
        <p>inner content</p>
      </SettingsSection>,
    );
    const header = screen.getByRole("button", { name: /Export/ });
    await user.click(header);
    const panelId = header.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toContainElement(screen.getByText("inner content"));
  });

  // SPEC.md's UI guidelines require touch targets of at least 44 points, and
  // this header is the only way into every settings group.
  it("gives the header a 44 point touch target", () => {
    render(
      <SettingsSection title="Export">
        <p>inner content</p>
      </SettingsSection>,
    );
    expect(screen.getByRole("button", { name: /Export/ })).toHaveStyle({ minHeight: "44px" });
  });
});
