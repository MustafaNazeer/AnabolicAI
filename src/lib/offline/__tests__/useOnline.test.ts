import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnline } from "@/lib/offline/useOnline";

function setOnline(v: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: v,
    writable: true,
  });
}

describe("useOnline", () => {
  it("reflects navigator.onLine after mount and updates on events", () => {
    setOnline(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
