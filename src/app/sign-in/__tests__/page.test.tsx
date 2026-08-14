import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// The page only needs to hand these to the form, and importing the real ones
// pulls in the rate limiter and its network clients for no benefit here.
vi.mock("@/lib/auth/actions", () => ({
  signIn: vi.fn(),
  signInAsDemo: vi.fn(),
  signInWithProvider: vi.fn(),
}));

import SignInPage from "@/app/sign-in/page";

// Character for character the sentence src/lib/auth/actions.ts returns when it
// refuses a password sign up. The callback route refuses provider sign ups for
// the same reason, so both paths have to say the same thing.
const REJECTION = "This email is not on the invite list.";

describe("the sign in page", () => {
  it("shows the rejection copy when the callback route refused the account", async () => {
    render(
      await SignInPage({ searchParams: Promise.resolve({ error: "not-invited" }) }),
    );
    expect(screen.getByText(REJECTION)).toBeInTheDocument();
  });

  it("says nothing when the visitor simply came to sign in", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(REJECTION)).not.toBeInTheDocument();
  });

  it("ignores an error parameter it does not recognise", async () => {
    render(
      await SignInPage({ searchParams: Promise.resolve({ error: "something-else" }) }),
    );
    expect(screen.queryByText(REJECTION)).not.toBeInTheDocument();
  });

  // A repeated query parameter arrives as an array rather than a string, so a
  // comparison loose enough to look inside it could be talked into showing the
  // notice by a crafted link. Equality against the marker cannot be.
  it("ignores a repeated error parameter that arrives as an array", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ error: ["not-invited", "x"] }),
      }),
    );
    expect(screen.queryByText(REJECTION)).not.toBeInTheDocument();
  });
});
