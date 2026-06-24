import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SplashLinks } from "../SplashLinks";
import { splashLinks } from "@/lib/brand/devices";

describe("SplashLinks", () => {
  it("renders one startup-image link per device", () => {
    render(<SplashLinks />);
    // React 19 hoists <link> elements to document.head in the jsdom environment
    const links = document.head.querySelectorAll(
      'link[rel="apple-touch-startup-image"]'
    );
    expect(links.length).toBe(splashLinks().length);
    expect(links[0].getAttribute("media")).toContain("(orientation: portrait)");
    expect(links[0].getAttribute("href")).toContain("/splash/splash-");
  });
});
