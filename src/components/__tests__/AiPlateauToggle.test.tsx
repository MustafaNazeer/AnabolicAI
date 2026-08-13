import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
        "Suggests a next step when a lift stalls. Sends that lift's name, muscle group, and recent sessions, only when you ask.",
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

  it("disables the switch while the save is in flight", async () => {
    let release: (value: { ok: true }) => void = () => {};
    setAiPlateauMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<AiPlateauToggle initial={false} />);
    const box = screen.getByLabelText<HTMLInputElement>("Plateau suggestions");
    await userEvent.click(box);
    expect(box).toBeDisabled();
    release({ ok: true });
    await waitFor(() => expect(box).not.toBeDisabled());
  });

  it("keeps the frosted tile look, dimmed while busy", async () => {
    render(<AiPlateauToggle initial={false} />);
    const row = screen.getByText("Plateau suggestions").closest("label");
    expect(row?.style.backdropFilter).toContain("blur");
    expect(row?.style.opacity).toBe("1");

    let release: (value: { ok: true }) => void = () => {};
    setAiPlateauMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const box = screen.getByLabelText<HTMLInputElement>("Plateau suggestions");
    await userEvent.click(box);
    expect(row?.style.opacity).toBe("0.5");
    release({ ok: true });
    await waitFor(() => expect(row?.style.opacity).toBe("1"));
  });
});
