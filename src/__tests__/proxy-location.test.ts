import { describe, it, expect } from "vitest";
import { statSync, readFileSync } from "node:fs";

const exists = (f: string) => {
  try {
    return statSync(f).isFile();
  } catch {
    return false;
  }
};

// This app keeps its routes under "src/app", and Next looks for the proxy file
// beside that directory rather than at the repository root. A "proxy.ts" left
// at the root is NOT an error and NOT a warning: it is silently ignored, the
// build still prints every route, and every other gate stays green while the
// app ships with no session redirect and no policy on any response.
//
// Measured rather than assumed, on 2026-08-07. With the file at the root the
// compiled functions-config-manifest.json held no proxy entry at all and five
// of the eleven public end to end guards failed, including the one asserting a
// signed out visitor is redirected away from every private route. tsc, lint,
// the unit suite, the build, npm audit and semgrep ALL passed on that tree.
//
// Note the asymmetry that makes this easy to get wrong: the old "middleware.ts"
// DID work from the repository root, so the obvious rename lands the file in a
// place that reads as correct and does nothing. Those end to end guards do not
// run in CI, so this test is the gate that does.
describe("the proxy file is where Next will actually find it", () => {
  it("keeps the proxy beside the app directory, not at the repository root", () => {
    expect(exists("src/proxy.ts")).toBe(true);
    expect(exists("proxy.ts")).toBe(false);
  });

  it("has not left a deprecated middleware file anywhere Next looks", () => {
    // Next 16 throws when both conventions are present, but a stray
    // "middleware.ts" on its own would take over and only warn.
    expect(exists("middleware.ts")).toBe(false);
    expect(exists("src/middleware.ts")).toBe(false);
  });

  it("exports the function under the name the convention requires", () => {
    const source = readFileSync("src/proxy.ts", "utf8");
    expect(source).toMatch(/export\s+async\s+function\s+proxy\s*\(/);
  });
});
