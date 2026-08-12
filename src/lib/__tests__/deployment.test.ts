import { describe, it, expect } from "vitest";
import { checkHost } from "@/lib/deployment";

const PROD = {
  canonicalHost: "onyx-kappa-five.vercel.app",
  vercelEnv: "production",
};

describe("checkHost", () => {
  it("says nothing when the browser is on the canonical host", () => {
    expect(checkHost("onyx-kappa-five.vercel.app", PROD)).toEqual({
      offCanonical: false,
    });
  });

  // The 2026-08-12 incident: a home screen install pinned to a build that was
  // not the live app. It looked entirely normal and cost an evening to find.
  it("reports the actual and canonical hosts when they differ", () => {
    expect(checkHost("onyx-cmwrvwqzn-mustafan4xs-projects.vercel.app", PROD)).toEqual({
      offCanonical: true,
      actual: "onyx-cmwrvwqzn-mustafan4xs-projects.vercel.app",
      canonical: "onyx-kappa-five.vercel.app",
      environment: "production",
    });
  });

  it("carries the environment so a preview identifies itself as one", () => {
    const verdict = checkHost("onyx-abc123-mustafan4xs-projects.vercel.app", {
      canonicalHost: "onyx-kappa-five.vercel.app",
      vercelEnv: "preview",
    });
    expect(verdict).toMatchObject({ offCanonical: true, environment: "preview" });
  });

  // A false alarm on the real app would be worse than the bug this guards
  // against, so every unknown resolves to silence rather than to a warning.
  it("says nothing when the canonical host is unknown, as in local development", () => {
    expect(checkHost("localhost:3000", { canonicalHost: undefined, vercelEnv: undefined })).toEqual(
      { offCanonical: false },
    );
  });

  it("says nothing when the browser host is unknown", () => {
    expect(checkHost("", PROD)).toEqual({ offCanonical: false });
  });

  it("labels the environment as unknown rather than omitting it", () => {
    const verdict = checkHost("elsewhere.example", {
      canonicalHost: "onyx-kappa-five.vercel.app",
      vercelEnv: undefined,
    });
    expect(verdict).toMatchObject({ offCanonical: true, environment: "unknown" });
  });
});
