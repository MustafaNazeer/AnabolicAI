import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  setAiVisibleMock,
  setAiQuickEntryMock,
  setAiPlateauMock,
  setAiInsightsMock,
} = vi.hoisted(() => ({
  setAiVisibleMock: vi.fn(),
  setAiQuickEntryMock: vi.fn(),
  setAiPlateauMock: vi.fn(),
  setAiInsightsMock: vi.fn(),
}));

vi.mock("@/lib/ai/visibility", () => ({ setAiVisible: setAiVisibleMock }));
vi.mock("@/lib/ai/actions", () => ({ setAiQuickEntry: setAiQuickEntryMock }));
vi.mock("@/lib/ai/plateau/actions", () => ({
  setAiPlateau: setAiPlateauMock,
}));
vi.mock("@/lib/ai/insights/actions", () => ({
  setAiInsights: setAiInsightsMock,
}));

import { AiSettings } from "@/components/AiSettings";

const consentRows = () => [
  screen.getByRole("checkbox", { name: /ai quick entry/i }),
  screen.getByRole("checkbox", { name: /plateau/i }),
  screen.getByRole("checkbox", { name: /weekly insights/i }),
];

const master = () => screen.getByRole("checkbox", { name: /show ai features/i });

beforeEach(() => {
  vi.clearAllMocks();
  setAiVisibleMock.mockResolvedValue({ ok: true });
  setAiQuickEntryMock.mockResolvedValue({ ok: true });
  setAiPlateauMock.mockResolvedValue({ ok: true });
  setAiInsightsMock.mockResolvedValue({ ok: true });
});

describe("the AI settings section", () => {
  it("leaves the three consent rows usable while the features are shown", () => {
    render(<AiSettings visible quickEntry={false} plateau={false} insights={false} />);
    for (const row of consentRows()) expect(row).toBeEnabled();
  });

  it("renders the three locked when the features start hidden", () => {
    render(
      <AiSettings
        visible={false}
        quickEntry={false}
        plateau={false}
        insights={false}
      />,
    );
    for (const row of consentRows()) expect(row).toBeDisabled();
  });

  // The four rows have to share state for this. Each AiToggle holds its own
  // `initial` in useState, so a server round trip would not reach them anyway,
  // and waiting on one would leave three rows briefly live after the surfaces
  // they govern had gone.
  it("locks the three the moment the master switch is turned off", async () => {
    render(<AiSettings visible quickEntry plateau insights />);
    for (const row of consentRows()) expect(row).toBeEnabled();

    await userEvent.click(master());

    await waitFor(() => {
      for (const row of consentRows()) expect(row).toBeDisabled();
    });
    expect(setAiVisibleMock).toHaveBeenCalledWith(false);
  });

  it("releases them again when the master switch is turned back on", async () => {
    render(
      <AiSettings
        visible={false}
        quickEntry={false}
        plateau={false}
        insights={false}
      />,
    );
    await userEvent.click(master());

    await waitFor(() => {
      for (const row of consentRows()) expect(row).toBeEnabled();
    });
  });

  // The master is the undo for its own lock, so it can never be part of what it
  // locks. This is the trap the whole section is designed around.
  it("never locks the master switch itself", async () => {
    render(
      <AiSettings
        visible={false}
        quickEntry={false}
        plateau={false}
        insights={false}
      />,
    );
    expect(master()).toBeEnabled();
  });

  // A failed write must not leave the interface claiming a state the database
  // does not have, or the three rows sit locked against a switch that is on.
  it("unlocks the three again when the write fails", async () => {
    setAiVisibleMock.mockResolvedValue({ error: "permission denied" });
    render(<AiSettings visible quickEntry plateau insights />);

    await userEvent.click(master());

    await waitFor(() => {
      for (const row of consentRows()) expect(row).toBeEnabled();
    });
  });
});
