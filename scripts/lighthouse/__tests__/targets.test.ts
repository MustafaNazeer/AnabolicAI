import { describe, it, expect } from "vitest";
import { measurementOrder, ROUTES } from "../targets.mts";
import type { Route } from "../targets.mts";

const route = (path: string, authenticated: boolean): Route => ({
  path,
  label: path,
  authenticated,
});

describe("measurementOrder", () => {
  it("measures every unauthenticated route before signing in", () => {
    const { before, after } = measurementOrder([
      route("/a", true),
      route("/b", false),
      route("/c", true),
    ]);
    expect(before.map((r) => r.path)).toEqual(["/b"]);
    expect(after.map((r) => r.path)).toEqual(["/a", "/c"]);
  });

  it("keeps the declared order within each group", () => {
    const { before } = measurementOrder([
      route("/second", false),
      route("/first", false),
    ]);
    expect(before.map((r) => r.path)).toEqual(["/second", "/first"]);
  });

  it("drops nothing, so every route is still measured", () => {
    const all = [route("/a", true), route("/b", false), route("/c", true)];
    const { before, after } = measurementOrder(all);
    expect([...before, ...after]).toHaveLength(all.length);
    expect(new Set([...before, ...after].map((r) => r.path))).toEqual(
      new Set(["/a", "/b", "/c"]),
    );
  });

  // The regression this whole split exists to prevent. Measured after the demo
  // sign in, /sign-in is not the sign in page at all: the proxy redirects a
  // signed in visitor to the dashboard, and Lighthouse then reports the
  // dashboard document with a failing redirects audit under the /sign-in label.
  it("puts the real /sign-in route ahead of the authenticated ones", () => {
    const { before, after } = measurementOrder(ROUTES);
    expect(before.map((r) => r.path)).toEqual(["/sign-in"]);
    expect(after.map((r) => r.path)).toEqual(["/", "/progress"]);
  });
});
