import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SplashLinks } from "../SplashLinks";
import { splashLinks } from "@/lib/brand/devices";
import { DEFAULT_THEME } from "@/lib/theme";

describe("SplashLinks", () => {
  it("renders one startup-image link per device", () => {
    render(<SplashLinks />);
    // React 19 hoists <link> elements to document.head in the jsdom environment
    const links = document.head.querySelectorAll(
      'link[rel="apple-touch-startup-image"]'
    );
    expect(links.length).toBe(splashLinks(DEFAULT_THEME).length);
    expect(links[0].getAttribute("media")).toContain("(orientation: portrait)");
    expect(links[0].getAttribute("href")).toContain("/splash/splash-");
  });

  // This is a server component inside a layout that renders data-theme="crimson"
  // for everyone, because the accent lives in localStorage and the server cannot
  // read it. So the markup ships the default and ThemeProvider corrects it after
  // hydration. Rendering anything else here would ship a splash that disagrees
  // with the pre-paint background for every visitor on the default accent.
  it("ships the default accent, which is what the server can know", () => {
    render(<SplashLinks />);
    const links = document.head.querySelectorAll(
      'link[rel="apple-touch-startup-image"]'
    );
    for (const l of links) {
      expect(l.getAttribute("href")).toContain(`/splash/splash-${DEFAULT_THEME}-`);
    }
  });
});
