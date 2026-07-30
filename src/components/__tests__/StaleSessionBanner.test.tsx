import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaleSessionBanner } from "@/components/StaleSessionBanner";
import { discardSession } from "@/lib/workout/actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/workout/actions", () => ({ discardSession: vi.fn() }));

const props = {
  sessionId: "sess1",
  startedAt: "2026-07-29T10:00:00.000Z",
};

describe("StaleSessionBanner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers resume, finish and discard", () => {
    render(<StaleSessionBanner {...props} onFinish={vi.fn()} />);
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
  });

  it("dismisses itself on resume", async () => {
    render(<StaleSessionBanner {...props} onFinish={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(
      screen.queryByRole("button", { name: /discard/i }),
    ).not.toBeInTheDocument();
  });

  it("hands finishing back to the caller", async () => {
    const onFinish = vi.fn();
    render(<StaleSessionBanner {...props} onFinish={onFinish} />);
    await userEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("asks for confirmation before discarding", async () => {
    render(<StaleSessionBanner {...props} onFinish={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /^discard$/i }));
    expect(discardSession).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /yes, discard/i }));
    expect(discardSession).toHaveBeenCalledWith("sess1");
  });
});
