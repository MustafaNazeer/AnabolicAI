import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { exportCsvMock } = vi.hoisted(() => ({ exportCsvMock: vi.fn() }));

vi.mock("@/lib/export/actions", () => ({ exportCsv: exportCsvMock }));

import { ExportPanel } from "@/components/ExportPanel";

const OK = { ok: true as const, filename: "anabolicai-sets-a-to-b.csv", csv: "Date\r\n2026-08-05" };

beforeEach(() => {
  exportCsvMock.mockReset().mockResolvedValue(OK);
});

afterEach(() => vi.unstubAllGlobals());

async function fillDates(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Start date"), "2026-08-01");
  await user.type(screen.getByLabelText("End date"), "2026-08-12");
}

describe("ExportPanel", () => {
  it("shares the file when the platform can share files", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { canShare: () => true, share });
    const user = userEvent.setup();
    render(<ExportPanel />);
    await fillDates(user);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  });

  // Safari tabs and desktop browsers take this path, so it is not dead code.
  //
  // The anchor's own click is spied on rather than document.createElement.
  // Stubbing createElement breaks React's own rendering, since React uses it
  // for every element, so that version of this test fails for a reason that
  // has nothing to do with the code under test.
  it("falls back to a download when the platform cannot share files", async () => {
    vi.stubGlobal("navigator", { canShare: () => false });
    // jsdom implements neither, and deliver() calls both.
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ExportPanel />);
    await fillDates(user);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();
  });

  it("shows the error the action returned", async () => {
    exportCsvMock.mockResolvedValue({ ok: false, error: "No sets in that range." });
    vi.stubGlobal("navigator", { canShare: () => true, share: vi.fn() });
    const user = userEvent.setup();
    render(<ExportPanel />);
    await fillDates(user);
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(await screen.findByText("No sets in that range.")).toBeInTheDocument();
  });

  // Being disabled and looking disabled are separate facts, and only one of
  // them had a test when this bit the quick entry work on 2026-08-09.
  it("disables Export, visibly, when no column is selected", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    for (const toggle of screen.getAllByRole("button", { pressed: true })) {
      await user.click(toggle);
    }
    const button = screen.getByRole("button", { name: "Export" });
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-60");
  });

  // The same control the Appearance section uses, so the two cannot drift.
  it("chooses the dataset with a segmented control, like Appearance", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    expect(screen.getByRole("tab", { name: "Sets" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "Sessions" }));
    expect(screen.getByRole("tab", { name: "Sessions" })).toHaveAttribute("aria-selected", "true");
  });

  it("swaps the column list when the dataset changes", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    expect(screen.getByRole("button", { name: "Exercise" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Sessions" }));
    expect(screen.queryByRole("button", { name: "Exercise" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Total sets" })).toBeInTheDocument();
  });

  // The ThemePicker pattern: selection is aria-pressed, not a checkbox.
  it("toggles a column with a pressed button", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    const reps = screen.getByRole("button", { name: "Reps" });
    expect(reps).toHaveAttribute("aria-pressed", "true");
    await user.click(reps);
    expect(reps).toHaveAttribute("aria-pressed", "false");
  });

  // Being selected and LOOKING selected are separate facts, and the accent
  // border is the only thing on screen that says which columns you will get.
  // Added after a teeth check found that deleting it broke no test at all.
  it("shows a selected column as selected", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    const reps = screen.getByRole("button", { name: "Reps" });
    expect(reps.style.border).toContain("var(--accent)");
    await user.click(reps);
    expect(reps.style.border).not.toContain("var(--accent)");
  });
});
