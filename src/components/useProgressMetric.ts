"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  resolveProgressMetric,
  DEFAULT_PROGRESS_METRIC,
  type ProgressMetric,
} from "@/lib/progress/progressMetric";

// Still "onyx" after the rename. Changing it resets the saved metric choice.
// See docs/rename.md.
const STORAGE_KEY = "onyx-progress-metric";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): ProgressMetric {
  return resolveProgressMetric(localStorage.getItem(STORAGE_KEY));
}

function getServerSnapshot(): ProgressMetric {
  return DEFAULT_PROGRESS_METRIC;
}

export function useProgressMetric(): {
  metric: ProgressMetric;
  setMetric: (m: ProgressMetric) => void;
} {
  const metric = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMetric = useCallback((m: ProgressMetric) => {
    localStorage.setItem(STORAGE_KEY, m);
    listeners.forEach((l) => l());
  }, []);
  return { metric, setMetric };
}
