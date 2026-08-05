import { describe, it, expect } from "vitest";
import { buildCsp } from "@/lib/security/csp";

const PROD = {
  dev: false,
  preview: false,
  supabaseUrl: "https://abc.supabase.co",
};

describe("buildCsp", () => {
  it("produces the exact production policy", () => {
    expect(buildCsp("testnonce", PROD)).toBe(
      "default-src 'self'; " +
        "script-src 'self' 'nonce-testnonce' 'strict-dynamic'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' blob: data:; " +
        "font-src 'self'; " +
        "connect-src 'self' https://abc.supabase.co; " +
        "worker-src 'self'; " +
        "manifest-src 'self'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'",
    );
  });

  // A nonce in style-src makes browsers ignore 'unsafe-inline', and the
  // style ATTRIBUTES Recharts and the view transitions write can only be
  // allowed by 'unsafe-inline'. This pins that the builder never adds one.
  it("keeps the nonce out of style-src", () => {
    const policy = buildCsp("testnonce", PROD);
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("style-src 'self' 'nonce-");
  });

  it("adds eval and the hot reload socket in dev only", () => {
    const dev = buildCsp("n", { ...PROD, dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
    const prod = buildCsp("n", PROD);
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain("ws:");
  });

  // Under 'strict-dynamic' a host source in script-src is ignored, so the
  // preview toolbar is admitted only where that can work: connect and frame.
  it("admits the preview toolbar in connect-src and frame-src only", () => {
    const preview = buildCsp("n", { ...PROD, preview: true });
    expect(preview).toContain(
      "connect-src 'self' https://abc.supabase.co https://vercel.live",
    );
    expect(preview).toContain("frame-src https://vercel.live");
    expect(preview).toContain(
      "script-src 'self' 'nonce-n' 'strict-dynamic'; ",
    );
    const prod = buildCsp("n", PROD);
    expect(prod).not.toContain("vercel.live");
    expect(prod).not.toContain("frame-src");
  });

  it("derives the origin from a full supabase url and survives a missing one", () => {
    expect(
      buildCsp("n", { ...PROD, supabaseUrl: "https://abc.supabase.co/rest/v1" }),
    ).toContain("connect-src 'self' https://abc.supabase.co;");
    expect(buildCsp("n", { ...PROD, supabaseUrl: undefined })).toContain(
      "connect-src 'self';",
    );
  });
});
