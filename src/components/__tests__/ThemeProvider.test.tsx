import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";
import { appleIconHref } from "@/lib/brand/themeAssets";
import { type Theme, THEMES, DEFAULT_THEME } from "@/lib/theme";

const STORAGE_KEY = "onyx-theme";

// Drives setTheme through a real click rather than hoisting it to a module
// binding, which react-hooks/globals blocks.
function Probe({ next }: { next?: Theme }) {
  const { setTheme } = useTheme();
  return next ? <button onClick={() => setTheme(next)}>switch</button> : null;
}

describe("ThemeProvider", () => {
  let link: HTMLLinkElement;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    // Next renders this tag from src/app/apple-icon.png, with a cache busting
    // query on the href. The provider must replace it wholesale, query and all.
    link = document.createElement("link");
    link.setAttribute("rel", "apple-touch-icon");
    link.setAttribute("href", "/apple-icon.png?apple-icon.abc123.png");
    document.head.appendChild(link);
  });

  afterEach(() => link.remove());

  it("puts the resolved theme on the document element", () => {
    localStorage.setItem(STORAGE_KEY, "emerald");
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(document.documentElement.getAttribute("data-theme")).toBe("emerald");
  });

  // iOS snapshots whatever this href points at when the user taps Add to Home
  // Screen, and never refetches. Pointing it at the current accent is the only
  // control the web platform gives over the installed icon.
  it("points the apple touch icon at the current accent", () => {
    localStorage.setItem(STORAGE_KEY, "emerald");
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(link.getAttribute("href")).toBe(appleIconHref("emerald"));
  });

  it("follows a theme change without a reload", () => {
    localStorage.setItem(STORAGE_KEY, "cobalt");
    const { getByRole } = render(
      <ThemeProvider><Probe next="rose" /></ThemeProvider>,
    );
    expect(link.getAttribute("href")).toBe(appleIconHref("cobalt"));
    fireEvent.click(getByRole("button", { name: "switch" }));
    expect(link.getAttribute("href")).toBe(appleIconHref("rose"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("rose");
  });

  it("falls back to the default accent when nothing is stored", () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(link.getAttribute("href")).toBe(appleIconHref(DEFAULT_THEME));
  });

  it("has a generated icon behind every theme it can point at", () => {
    for (const theme of THEMES) {
      localStorage.setItem(STORAGE_KEY, theme);
      const { unmount } = render(<ThemeProvider><Probe /></ThemeProvider>);
      expect(link.getAttribute("href")).toBe(`/icons/apple-icon-${theme}.png`);
      unmount();
    }
  });

  it("does not throw when the page has no apple touch icon tag", () => {
    link.remove();
    expect(() =>
      render(<ThemeProvider><Probe /></ThemeProvider>),
    ).not.toThrow();
    document.head.appendChild(link);
  });
});
