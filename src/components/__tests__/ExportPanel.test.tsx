import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { exportCsvMock } = vi.hoisted(() => ({ exportCsvMock: vi.fn() }));

vi.mock("@/lib/export/actions", () => ({ exportCsv: exportCsvMock }));

import { ExportPanel } from "@/components/ExportPanel";

const OK = { ok: true as const, filename: "onyx-sets-a-to-b.csv", csv: "Date\r\n2026-08-05" };

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
  it("disables Export, visibly, when no column is ticked", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    for (const box of screen.getAllByRole("checkbox")) {
      if ((box as HTMLInputElement).checked) await user.click(box);
    }
    const button = screen.getByRole("button", { name: "Export" });
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-60");
  });

  it("swaps the column list when the dataset changes", async () => {
    const user = userEvent.setup();
    render(<ExportPanel />);
    expect(screen.getByLabelText("Exercise")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Sessions" }));
    expect(screen.queryByLabelText("Exercise")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Total sets")).toBeInTheDocument();
  });
});
