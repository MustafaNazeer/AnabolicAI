import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setAiPlateauMock } = vi.hoisted(() => ({ setAiPlateauMock: vi.fn() }));

vi.mock("@/lib/ai/plateau/actions", () => ({
  setAiPlateau: setAiPlateauMock,
}));

import { AiPlateauToggle } from "@/components/AiPlateauToggle";

beforeEach(() => {
  vi.clearAllMocks();
  setAiPlateauMock.mockResolvedValue({ ok: true });
});

describe("AiPlateauToggle", () => {
  it("names the feature and says exactly what leaves the device", () => {
    render(<AiPlateauToggle initial={false} />);
    expect(screen.getByText("Plateau suggestions")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Suggests a next step when a lift stalls. Sends that lift's recent sessions, only when you ask.",
      ),
    ).toBeInTheDocument();
  });

  it("persists a change through the action", async () => {
    render(<AiPlateauToggle initial={false} />);
    await userEvent.click(screen.getByLabelText("Plateau suggestions"));
    expect(setAiPlateauMock).toHaveBeenCalledWith(true);
  });

  it("reverts the switch when the save fails", async () => {
    setAiPlateauMock.mockResolvedValue({ error: "nope" });
    render(<AiPlateauToggle initial={false} />);
    const box = screen.getByLabelText<HTMLInputElement>("Plateau suggestions");
    await userEvent.click(box);
    expect(box.checked).toBe(false);
  });
});
