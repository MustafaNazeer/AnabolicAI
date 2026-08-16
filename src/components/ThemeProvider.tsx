"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { type Theme, DEFAULT_THEME, resolveTheme } from "@/lib/theme";
import { appleIconHref } from "@/lib/brand/themeAssets";

type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
// Still "onyx" after the rename. Changing it resets every user's saved
// preference. See docs/rename.md.
const STORAGE_KEY = "onyx-theme";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  return resolveTheme(localStorage.getItem(STORAGE_KEY));
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    listeners.forEach((l) => l());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // iOS reads this tag rather than the web manifest for the home screen
    // icon, and it snapshots whatever the href points at AT THE MOMENT the
    // user taps Add to Home Screen, then never refetches. Keeping it aimed at
    // the current accent is the only control the web platform gives over the
    // installed icon. It cannot change one that is already installed; that
    // needs a delete and re-add, and no API avoids it.
    //
    // Optional chaining rather than a guard: the tag is rendered by Next from
    // src/app/apple-icon.png and is always there in the app, but tests and any
    // future page that drops it should not crash the whole provider.
    document
      .querySelector('link[rel="apple-touch-icon"]')
      ?.setAttribute("href", appleIconHref(theme));
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
