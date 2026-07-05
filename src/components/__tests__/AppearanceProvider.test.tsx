import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { AppearanceProvider, useAppearance } from "@/components/AppearanceProvider";

let mqListeners: Array<(e: { matches: boolean }) => void>;
let mqMatches: boolean;

function installMatchMedia(matches: boolean) {
  mqMatches = matches;
  mqListeners = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return mqMatches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) =>
      mqListeners.push(cb),
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

function Probe() {
  const { mode, appearance } = useAppearance();
  return <span data-testid="probe">{`${mode}:${appearance}`}</span>;
}

describe("AppearanceProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-mode");
  });

  it("applies an explicit light mode", () => {
    installMatchMedia(true);
    localStorage.setItem("onyx-mode", "light");
    const { getByTestId } = render(
      <AppearanceProvider>
        <Probe />
      </AppearanceProvider>,
    );
    expect(getByTestId("probe").textContent).toBe("light:light");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  it("system follows prefers-color-scheme and reacts to change", () => {
    installMatchMedia(true); // OS dark
    localStorage.setItem("onyx-mode", "system");
    const { getByTestId } = render(
      <AppearanceProvider>
        <Probe />
      </AppearanceProvider>,
    );
    expect(getByTestId("probe").textContent).toBe("system:dark");
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");

    act(() => {
      mqMatches = false; // OS flips to light
      mqListeners.forEach((cb) => cb({ matches: false }));
    });
    expect(getByTestId("probe").textContent).toBe("system:light");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  describe("theme-color meta sync", () => {
    let lightMeta: HTMLMetaElement;
    let darkMeta: HTMLMetaElement;

    beforeEach(() => {
      lightMeta = document.createElement("meta");
      lightMeta.setAttribute("name", "theme-color");
      lightMeta.setAttribute("media", "(prefers-color-scheme: light)");
      lightMeta.setAttribute("content", "#eef3fc");
      document.head.appendChild(lightMeta);

      darkMeta = document.createElement("meta");
      darkMeta.setAttribute("name", "theme-color");
      darkMeta.setAttribute("media", "(prefers-color-scheme: dark)");
      darkMeta.setAttribute("content", "#070a10");
      document.head.appendChild(darkMeta);
    });

    afterEach(() => {
      lightMeta.remove();
      darkMeta.remove();
    });

    it("updates every theme-color meta when OS is dark but the user manually picks light", () => {
      installMatchMedia(true); // OS dark
      localStorage.setItem("onyx-mode", "light"); // manual override to light
      render(
        <AppearanceProvider>
          <Probe />
        </AppearanceProvider>,
      );
      expect(lightMeta.getAttribute("content")).toBe("#eef3fc");
      expect(darkMeta.getAttribute("content")).toBe("#eef3fc");
    });
  });
});
