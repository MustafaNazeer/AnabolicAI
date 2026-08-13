// src/components/__tests__/InsightsCard.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { suggestMock, setAiInsightsMock, onlineMock } = vi.hoisted(() => ({
  suggestMock: vi.fn(),
  setAiInsightsMock: vi.fn(),
  onlineMock: vi.fn(),
}));

vi.mock("@/lib/ai/insights/actions", () => ({
  suggestInsights: suggestMock,
  setAiInsights: setAiInsightsMock,
}));

vi.mock("@/lib/offline/useOnline", () => ({
  useOnline: onlineMock,
}));

import { InsightsCard } from "@/components/InsightsCard";

const ASK = "What stands out this week?";

beforeEach(() => {
  vi.clearAllMocks();
  onlineMock.mockReturnValue(true);
  suggestMock.mockResolvedValue({
    ok: true,
    insights: ["Your bench is holding steady.", "Volume is up this week."],
    anyStalled: false,
  });
  setAiInsightsMock.mockResolvedValue({ ok: true });
});

describe("InsightsCard", () => {
  it("offers one button under an Insights heading", () => {
    render(<InsightsCard initialEnabled={true} />);
    expect(
      screen.getByRole("heading", { name: "Insights" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ASK })).toBeInTheDocument();
  });

  it("shows the notice first and sends nothing while consent is off", async () => {
    render(<InsightsCard initialEnabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    expect(suggestMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/five most recently trained lifts/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("enabling from the notice persists consent and then fetches", async () => {
    render(<InsightsCard initialEnabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    await userEvent.click(screen.getByRole("button", { name: "Enable" }));
    expect(setAiInsightsMock).toHaveBeenCalledWith(true);
    expect(suggestMock).toHaveBeenCalled();
  });

  it("mounts the status region before any fetch, so a screen reader has something to observe", () => {
    render(<InsightsCard initialEnabled={true} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("lands the insights in the status region labeled as AI", async () => {
    render(<InsightsCard initialEnabled={true} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    const region = await screen.findByRole("status");
    expect(region).toHaveTextContent("Your bench is holding steady.");
    expect(region).toHaveTextContent("Volume is up this week.");
    expect(region).toHaveTextContent("AI insights");
  });

  it("shows the Progress nudge only when a lift has stopped progressing", async () => {
    suggestMock.mockResolvedValue({
      ok: true,
      insights: ["Your bench has stalled."],
      anyStalled: true,
    });
    render(<InsightsCard initialEnabled={true} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    const link = await screen.findByRole("link", {
      name: /Progress has a suggestion/,
    });
    expect(link).toHaveAttribute("href", "/progress");
  });

  it("omits the Progress nudge when nothing is stalled", async () => {
    render(<InsightsCard initialEnabled={true} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    await screen.findByText("Your bench is holding steady.");
    expect(
      screen.queryByRole("link", { name: /Progress has a suggestion/ }),
    ).not.toBeInTheDocument();
  });

  it("disables the button while offline, visibly", () => {
    onlineMock.mockReturnValue(false);
    render(<InsightsCard initialEnabled={true} />);
    const button = screen.getByRole("button", { name: ASK });
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-60");
  });

  it("clears busy and shows the friendly copy when the consent write rejects", async () => {
    setAiInsightsMock.mockRejectedValue(new Error("network drop"));
    render(<InsightsCard initialEnabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    const enableButton = screen.getByRole("button", { name: "Enable" });
    await userEvent.click(enableButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not turn that on. Try again in a moment.",
    );
    expect(enableButton).not.toBeDisabled();
  });

  it("clears busy and shows the unavailable copy when the fetch rejects", async () => {
    suggestMock.mockRejectedValue(new Error("network drop"));
    render(<InsightsCard initialEnabled={true} />);
    const askButton = screen.getByRole("button", { name: ASK });
    await userEvent.click(askButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Insights are unavailable right now.",
    );
    expect(askButton).not.toBeDisabled();
  });

  it("shows the action's error copy and allows a retry", async () => {
    suggestMock.mockResolvedValueOnce({
      ok: false,
      error: "Log a few workouts first.",
    });
    render(<InsightsCard initialEnabled={true} />);
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Log a few workouts first.",
    );
    await userEvent.click(screen.getByRole("button", { name: ASK }));
    const region = await screen.findByRole("status");
    expect(region).toHaveTextContent("Your bench is holding steady.");
  });

  it("renders repeated identical sentences without duplicate key warnings", async () => {
    suggestMock.mockResolvedValue({
      ok: true,
      insights: ["Same sentence.", "Same sentence."],
      anyStalled: false,
    });
    const warnings: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };
    try {
      render(<InsightsCard initialEnabled={true} />);
      await userEvent.click(screen.getByRole("button", { name: ASK }));
      await screen.findAllByText("Same sentence.");
    } finally {
      console.error = original;
    }
    expect(warnings.filter((w) => w.includes("same key"))).toEqual([]);
  });
});
