import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HostWarning } from "@/components/HostWarning";

const CANONICAL = "onyx-kappa-five.vercel.app";

// jsdom's location is read only, so the host is stubbed rather than assigned.
function setHost(host: string) {
  vi.stubGlobal("location", { ...window.location, host });
}

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => setHost(CANONICAL));

describe("HostWarning", () => {
  it("renders nothing on the canonical host", () => {
    render(<HostWarning canonicalHost={CANONICAL} vercelEnv="production" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // The whole point: the host has to be on screen, because reading it back is
  // what tells you which build a device is pinned to.
  it("names both hosts when the browser is somewhere else", () => {
    setHost("onyx-cmwrvwqzn-mustafan4xs-projects.vercel.app");
    render(<HostWarning canonicalHost={CANONICAL} vercelEnv="preview" />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("onyx-cmwrvwqzn-mustafan4xs-projects.vercel.app");
    expect(banner).toHaveTextContent(CANONICAL);
  });

  it("says which environment it is", () => {
    setHost("onyx-abc123-mustafan4xs-projects.vercel.app");
    render(<HostWarning canonicalHost={CANONICAL} vercelEnv="preview" />);
    expect(screen.getByRole("status")).toHaveTextContent("preview");
  });

  // Local development has no canonical host, and a warning there would be a
  // false alarm on every single run.
  it("renders nothing when the canonical host is unknown", () => {
    setHost("localhost:3000");
    render(<HostWarning canonicalHost={undefined} vercelEnv={undefined} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
