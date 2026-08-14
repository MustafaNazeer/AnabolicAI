import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { AuthForm } from "@/components/AuthForm";

const noopAction = async () => {};

describe("AuthForm provider buttons", () => {
  it("renders both providers on sign in", async () => {
    const { container } = render(
      <AuthForm mode="sign-in" action={noopAction} providerAction={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("passes the provider name through on tap", async () => {
    const providerAction = vi.fn(async () => {});
    render(<AuthForm mode="sign-in" action={noopAction} providerAction={providerAction} />);
    await userEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(providerAction).toHaveBeenCalledWith("google");
  });

  it("passes github through on tap, not google", async () => {
    const providerAction = vi.fn(async () => {});
    render(<AuthForm mode="sign-in" action={noopAction} providerAction={providerAction} />);
    await userEvent.click(screen.getByRole("button", { name: /github/i }));
    expect(providerAction).toHaveBeenCalledWith("github");
  });

  it("shows the error when a provider sign in is rate limited", async () => {
    const providerAction = vi
      .fn()
      .mockResolvedValue({ error: "Too many attempts. Try again in a few minutes." });
    render(<AuthForm mode="sign-in" action={noopAction} providerAction={providerAction} />);
    await userEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(
      await screen.findByText("Too many attempts. Try again in a few minutes."),
    ).toBeInTheDocument();
  });

  // Sign up is invite only through ALLOWED_EMAILS and the provider path
  // enforces that in the callback, so offering the buttons on the sign up
  // screen would promise a route that ends in a rejection.
  it("renders neither on sign up", () => {
    render(<AuthForm mode="sign-up" action={noopAction} providerAction={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /github/i })).toBeNull();
  });
});
