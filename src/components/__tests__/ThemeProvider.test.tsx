import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";
import {
  appleIconHref,
  SPLASH_THEMES,
  splashThemeFor,
} from "@/lib/brand/themeAssets";
import { splashLinks } from "@/lib/brand/devices";
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

// The launch splash. Unlike the icon there are eleven links, one per device,
// distinguished only by their media query, so the provider rewrites them by
// looking each one up by that query rather than by position.
//
// What is NOT known, and is the whole reason this ships to a device first: iOS
// may capture the startup images at Add to Home Screen the way it captures the
// icon, in which case a swap made after install changes nothing until the app
// is deleted and re-added. Nothing in these tests can answer that. They only
// prove the swap happens in the DOM.
describe("ThemeProvider, launch splash", () => {
  let splash: HTMLLinkElement[] = [];

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    splash = splashLinks(DEFAULT_THEME).map((l) => {
      const el = document.createElement("link");
      el.setAttribute("rel", "apple-touch-startup-image");
      el.setAttribute("href", l.href);
      el.setAttribute("media", l.media);
      document.head.appendChild(el);
      return el;
    });
  });

  afterEach(() => {
    splash.forEach((el) => el.remove());
    splash = [];
  });

  const hrefs = () => splash.map((el) => el.getAttribute("href"));

  it("points every startup image at the current accent", () => {
    const other = SPLASH_THEMES.find((t) => t !== DEFAULT_THEME)!;
    localStorage.setItem(STORAGE_KEY, other);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    for (const h of hrefs()) {
      expect(h).toContain(`/splash/splash-${other}-`);
    }
  });

  it("keeps each link on its own device rather than shuffling them", () => {
    const other = SPLASH_THEMES.find((t) => t !== DEFAULT_THEME)!;
    localStorage.setItem(STORAGE_KEY, other);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    // The href for a given media query must be that device's own file. A
    // position based rewrite passes the test above and fails this one.
    const expected = new Map(splashLinks(other).map((l) => [l.media, l.href]));
    for (const el of splash) {
      expect(el.getAttribute("href")).toBe(expected.get(el.getAttribute("media")!));
    }
  });

  it("follows a theme change without a reload", () => {
    const other = SPLASH_THEMES.find((t) => t !== DEFAULT_THEME)!;
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME);
    const { getByRole } = render(
      <ThemeProvider><Probe next={other} /></ThemeProvider>,
    );
    expect(hrefs()[0]).toContain(`/splash/splash-${DEFAULT_THEME}-`);
    fireEvent.click(getByRole("button", { name: "switch" }));
    for (const h of hrefs()) {
      expect(h).toContain(`/splash/splash-${other}-`);
    }
  });

  // The accents without a generated splash set are the point of this test. A
  // naive rewrite would aim them at a file that does not exist, and because the
  // matcher only excludes the accents that DO exist, that path is not a broken
  // image: it is a 307 to /sign-in mid launch.
  it("falls back to the default accent for one with no generated splash", () => {
    const ungenerated = THEMES.filter((t) => !SPLASH_THEMES.includes(t));
    for (const theme of ungenerated) {
      localStorage.setItem(STORAGE_KEY, theme);
      const { unmount } = render(<ThemeProvider><Probe /></ThemeProvider>);
      for (const h of hrefs()) {
        expect(h, `${theme} points at a splash that is not generated`).toContain(
          `/splash/splash-${DEFAULT_THEME}-`,
        );
      }
      unmount();
    }
  });

  it("has a generated file behind every accent it can point at", () => {
    for (const theme of THEMES) {
      expect(SPLASH_THEMES).toContain(splashThemeFor(theme));
    }
  });

  it("does not throw when the page has no startup image tags", () => {
    splash.forEach((el) => el.remove());
    expect(() =>
      render(<ThemeProvider><Probe /></ThemeProvider>),
    ).not.toThrow();
  });
});
