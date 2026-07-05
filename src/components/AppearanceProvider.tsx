"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  type Mode,
  type Appearance,
  DEFAULT_MODE,
  resolveMode,
  resolveAppearance,
} from "@/lib/appearance";

type AppearanceContextValue = {
  mode: Mode;
  appearance: Appearance;
  setMode: (m: Mode) => void;
};
const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const STORAGE_KEY = "onyx-mode";
const THEME_COLOR: Record<Appearance, string> = {
  dark: "#070a10",
  light: "#eef3fc",
};

const listeners = new Set<() => void>();

function darkQuery(): MediaQueryList {
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  const mq = darkQuery();
  mq.addEventListener("change", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
    mq.removeEventListener("change", callback);
  };
}

// Primitive snapshot: "<mode>|<system dark?>". Changes when either axis changes.
function getSnapshot(): string {
  const mode = resolveMode(localStorage.getItem(STORAGE_KEY));
  return `${mode}|${darkQuery().matches ? "1" : "0"}`;
}
function getServerSnapshot(): string {
  return `${DEFAULT_MODE}|1`;
}

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [modePart, darkPart] = snap.split("|");
  const mode = modePart as Mode;
  const appearance = resolveAppearance(mode, darkPart === "1");

  const setMode = useCallback((m: Mode) => {
    localStorage.setItem(STORAGE_KEY, m);
    listeners.forEach((l) => l());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", appearance);
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", THEME_COLOR[appearance]));
  }, [appearance]);

  return (
    <AppearanceContext.Provider value={{ mode, appearance, setMode }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx)
    throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
