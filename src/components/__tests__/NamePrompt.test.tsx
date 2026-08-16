import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

const { saveMock } = vi.hoisted(() => ({
  saveMock: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("@/lib/profile/actions", () => ({ setDisplayName: saveMock }));

import { NamePrompt } from "@/components/NamePrompt";

beforeEach(() => vi.clearAllMocks());

describe("NamePrompt", () => {
  it("sends the name that was typed", async () => {
    render(<NamePrompt />);
    await userEvent.type(screen.getByLabelText(/what should i call you/i), "Mustafa");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMock).toHaveBeenCalledWith("Mustafa");
  });

  it("trims before sending", async () => {
    render(<NamePrompt />);
    await userEvent.type(screen.getByLabelText(/what should i call you/i), "  Mustafa  ");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMock).toHaveBeenCalledWith("Mustafa");
  });

  // THE PROMPT MUST BE DISMISSIBLE OR IT IS NOT A ONE TIME QUESTION. Declining
  // writes an empty string, which is what tells the column this account was
  // asked, so it is never asked again.
  it("records a refusal rather than leaving the question open", async () => {
    render(<NamePrompt />);
    await userEvent.click(screen.getByRole("button", { name: /not now/i }));
    expect(saveMock).toHaveBeenCalledWith("");
  });

  it("disappears once a name is saved", async () => {
    render(<NamePrompt />);
    await userEvent.type(screen.getByLabelText(/what should i call you/i), "Mustafa");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.queryByLabelText(/what should i call you/i)).toBeNull(),
    );
  });

  it("refuses an empty name from the save button rather than storing a refusal", async () => {
    render(<NamePrompt />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/tell me what to call you/i)).toBeInTheDocument();
  });

  it("stays put and says so when the save fails", async () => {
    saveMock.mockResolvedValueOnce({ error: "Network is down." } as never);
    render(<NamePrompt />);
    await userEvent.type(screen.getByLabelText(/what should i call you/i), "Mustafa");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Network is down.")).toBeInTheDocument();
    expect(screen.getByLabelText(/what should i call you/i)).toHaveValue("Mustafa");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<NamePrompt />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
