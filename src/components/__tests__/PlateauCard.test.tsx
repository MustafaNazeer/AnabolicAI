import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { suggestMock, setAiPlateauMock } = vi.hoisted(() => ({
  suggestMock: vi.fn(),
  setAiPlateauMock: vi.fn(),
}));

vi.mock("@/lib/ai/plateau/actions", () => ({
  suggestForPlateau: suggestMock,
  setAiPlateau: setAiPlateauMock,
}));

import { PlateauCard } from "@/components/PlateauCard";

const PROPS = {
  exerciseId: "11111111-2222-4333-8444-555555555555",
  exerciseName: "Bench Press",
  aiEnabled: true,
  onAiEnabled: vi.fn(),
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  suggestMock.mockResolvedValue({
    ok: true,
    suggestion: { kind: "deload", text: "Drop to 175 and build back up." },
  });
  setAiPlateauMock.mockResolvedValue({ ok: true });
});

describe("PlateauCard", () => {
  it("renders nothing unless the lift is stalled or declining", () => {
    for (const status of ["improving", "uncertain", "insufficient", "stale"] as const) {
      const { container, unmount } = render(
        <PlateauCard {...PROPS} status={status} />,
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("states the stall plainly and offers one button", () => {
    render(<PlateauCard {...PROPS} status="stalled" />);
    expect(
      screen.getByText(
        "Your estimated max on Bench Press has not moved across your last four sessions.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What should I try?" }),
    ).toBeInTheDocument();
  });

  it("says slipping rather than stalled for a decline", () => {
    render(<PlateauCard {...PROPS} status="declining" />);
    expect(
      screen.getByText(
        "Your estimated max on Bench Press has been slipping across your last four sessions.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the notice first and sends nothing while consent is off", async () => {
    render(<PlateauCard {...PROPS} aiEnabled={false} status="stalled" />);
    await userEvent.click(screen.getByRole("button", { name: "What should I try?" }));
    expect(suggestMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/sends this lift's last few sessions/i),
    ).toBeInTheDocument();
  });

  it("enabling from the notice persists consent and then fetches", async () => {
    const onAiEnabled = vi.fn();
    render(
      <PlateauCard {...PROPS} aiEnabled={false} onAiEnabled={onAiEnabled} status="stalled" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "What should I try?" }));
    await userEvent.click(screen.getByRole("button", { name: "Enable" }));
    expect(setAiPlateauMock).toHaveBeenCalledWith(true);
    expect(onAiEnabled).toHaveBeenCalled();
    expect(suggestMock).toHaveBeenCalledWith(PROPS.exerciseId);
  });

  it("mounts the status region before any fetch, so a screen reader has something to observe", () => {
    render(<PlateauCard {...PROPS} status="stalled" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("lands the suggestion in a status region labeled as AI", async () => {
    render(<PlateauCard {...PROPS} status="stalled" />);
    await userEvent.click(screen.getByRole("button", { name: "What should I try?" }));
    const region = await screen.findByRole("status");
    expect(region).toHaveTextContent("Drop to 175 and build back up.");
    expect(region).toHaveTextContent("AI suggestion");
  });

  it("disables the Enable button while the consent write is in flight", async () => {
    let release: (value: { ok: true }) => void = () => {};
    setAiPlateauMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<PlateauCard {...PROPS} aiEnabled={false} status="stalled" />);
    await userEvent.click(screen.getByRole("button", { name: "What should I try?" }));
    const enableButton = screen.getByRole("button", { name: "Enable" });
    await userEvent.click(enableButton);
    expect(enableButton).toBeDisabled();
    release({ ok: true });
    await waitFor(() => expect(suggestMock).toHaveBeenCalledWith(PROPS.exerciseId));
  });

  it("shows the action's error copy and allows a retry", async () => {
    suggestMock.mockResolvedValueOnce({ ok: false, error: "Suggestions are unavailable right now." });
    render(<PlateauCard {...PROPS} status="stalled" />);
    await userEvent.click(screen.getByRole("button", { name: "What should I try?" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Suggestions are unavailable right now.",
    );
    await userEvent.click(screen.getByRole("button", { name: "What should I try?" }));
    const region = await screen.findByRole("status");
    expect(region).toHaveTextContent("Drop to 175 and build back up.");
  });
});
