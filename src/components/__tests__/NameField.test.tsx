import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { saveMock } = vi.hoisted(() => ({
  saveMock: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("@/lib/profile/actions", () => ({ setDisplayName: saveMock }));

import { NameField } from "@/components/NameField";

beforeEach(() => vi.clearAllMocks());

describe("NameField", () => {
  // The field is the only way to change the answer after the prompt, including
  // for someone who dismissed it, so it has to start from what is stored rather
  // than empty.
  it("starts from the stored name", () => {
    render(<NameField initial="Mustafa" />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Mustafa");
  });

  it("sends the trimmed name", async () => {
    render(<NameField initial="" />);
    await userEvent.type(screen.getByLabelText(/your name/i), "  Mustafa  ");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMock).toHaveBeenCalledWith("Mustafa");
  });

  // Unlike the prompt's "Not now", an empty field here is someone who cleared
  // the box, not someone declining to answer. Storing it would silently drop
  // the name they already had.
  it("refuses to save an empty field", async () => {
    render(<NameField initial="Mustafa" />);
    await userEvent.clear(screen.getByLabelText(/your name/i));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/tell me what to call you/i)).toBeInTheDocument();
  });

  it("confirms a save so the field does not look inert", async () => {
    render(<NameField initial="" />);
    await userEvent.type(screen.getByLabelText(/your name/i), "Mustafa");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("shows the error rather than swallowing it", async () => {
    saveMock.mockResolvedValueOnce({ error: "Network is down." } as never);
    render(<NameField initial="" />);
    await userEvent.type(screen.getByLabelText(/your name/i), "Mustafa");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Network is down.")).toBeInTheDocument();
    expect(screen.queryByText(/^saved\.$/i)).toBeNull();
  });
});
