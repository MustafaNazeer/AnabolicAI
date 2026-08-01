import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/AuthForm";

describe("AuthForm demo button", () => {
  it("is absent when no demo action is given", () => {
    render(<AuthForm mode="sign-in" action={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Try the demo" }),
    ).not.toBeInTheDocument();
  });

  it("is absent on the sign up screen even if an action is given", () => {
    render(<AuthForm mode="sign-up" action={vi.fn()} demoAction={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Try the demo" }),
    ).not.toBeInTheDocument();
  });

  it("calls the demo action when clicked", async () => {
    const demoAction = vi.fn().mockResolvedValue(undefined);
    render(<AuthForm mode="sign-in" action={vi.fn()} demoAction={demoAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Try the demo" }));
    expect(demoAction).toHaveBeenCalledTimes(1);
  });

  it("shows the error when the demo sign in fails", async () => {
    const demoAction = vi.fn().mockResolvedValue({ error: "Demo is unavailable." });
    render(<AuthForm mode="sign-in" action={vi.fn()} demoAction={demoAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Try the demo" }));
    expect(await screen.findByText("Demo is unavailable.")).toBeInTheDocument();
  });
});
