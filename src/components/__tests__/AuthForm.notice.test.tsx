import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthForm } from "@/components/AuthForm";

// Pinned character for character. This is the same sentence the password sign
// up path returns from src/lib/auth/actions.ts, so the two refusals speak with
// one voice. Without an assertion here, a reword on either path could drift
// from the other and nothing would notice.
const REJECTION = "This email is not on the invite list.";

describe("AuthForm notice", () => {
  it("renders the rejection notice it is given", () => {
    render(<AuthForm mode="sign-in" action={vi.fn()} notice={REJECTION} />);
    expect(screen.getByText(REJECTION)).toBeInTheDocument();
  });

  it("shows no notice when none is given", () => {
    render(<AuthForm mode="sign-in" action={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the sign in form usable alongside the notice", () => {
    render(<AuthForm mode="sign-in" action={vi.fn()} notice={REJECTION} />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
