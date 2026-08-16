"use client";

import { useCallback, useSyncExternalStore } from "react";
import { resolveMetric, DEFAULT_METRIC } from "@/lib/progress/metric";
import { type MatrixMetric } from "@/lib/progress/matrix";

// Still "onyx" after the rename. Changing it resets the saved metric choice.
// See docs/rename.md.
const STORAGE_KEY = "onyx-matrix-metric";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): MatrixMetric {
  return resolveMetric(localStorage.getItem(STORAGE_KEY));
}

function getServerSnapshot(): MatrixMetric {
  return DEFAULT_METRIC;
}

export function useMatrixMetric(): {
  metric: MatrixMetric;
  setMetric: (m: MatrixMetric) => void;
} {
  const metric = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMetric = useCallback((m: MatrixMetric) => {
    localStorage.setItem(STORAGE_KEY, m);
    listeners.forEach((l) => l());
  }, []);
  return { metric, setMetric };
}
