import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSection } from "@/components/ui/SettingsSection";

function panelOf(header: HTMLElement): HTMLElement {
  const id = header.getAttribute("aria-controls");
  const panel = id ? document.getElementById(id) : null;
  if (!panel) throw new Error("header does not point at a panel");
  return panel;
}

describe("SettingsSection", () => {
  it("starts collapsed", () => {
    render(
      <SettingsSection title="Notifications">
        <p>inner content</p>
      </SettingsSection>,
    );
    const header = screen.getByRole("button", { name: /Notifications/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(panelOf(header)).toHaveAttribute("data-open", "false");
  });

  // The contents stay mounted so the panel has a height to animate to. inert is
  // what keeps a closed group out of the tab order and out of the accessibility
  // tree, and it is the guarantee that replaces unmounting.
  it("makes a closed group inert rather than merely invisible", () => {
    render(
      <SettingsSection title="Notifications">
        <button type="button">inner control</button>
      </SettingsSection>,
    );
    const panel = panelOf(screen.getByRole("button", { name: /Notifications/ }));
    expect(panel).toHaveAttribute("inert");
  });

  it("opens on a tap and lifts the inert flag", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="Notifications">
        <p>inner content</p>
      </SettingsSection>,
    );
    const header = screen.getByRole("button", { name: /Notifications/ });
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(panelOf(header)).toHaveAttribute("data-open", "true");
    expect(panelOf(header)).not.toHaveAttribute("inert");
  });

  it("closes again on a second tap", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="Export">
        <p>inner content</p>
      </SettingsSection>,
    );
    const header = screen.getByRole("button", { name: /Export/ });
    await user.click(header);
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(panelOf(header)).toHaveAttribute("data-open", "false");
    expect(panelOf(header)).toHaveAttribute("inert");
  });

  // The whole point of the 2026-08-12 fix: the panel animates itself, so
  // nothing else on the page is captured or moved. A view transition snapshots
  // the entire document, which is what produced two offset copies of the page
  // ghosting through each other on collapse.
  it("carries the class that animates its own height", () => {
    render(
      <SettingsSection title="Export">
        <p>inner content</p>
      </SettingsSection>,
    );
    const panel = panelOf(screen.getByRole("button", { name: /Export/ }));
    expect(panel.className).toContain("onyx-collapsible");
  });

  it("points the header at the panel it controls", () => {
    render(
      <SettingsSection title="Export">
        <p>inner content</p>
      </SettingsSection>,
    );
    const header = screen.getByRole("button", { name: /Export/ });
    expect(panelOf(header)).toContainElement(screen.getByText("inner content"));
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
