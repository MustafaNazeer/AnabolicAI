import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AuthForm } from "../AuthForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const noopAction = async () => {};

describe("AuthForm brand", () => {
  it("shows the Onyx mark above the wordmark on sign-in", () => {
    const { getAllByRole } = render(
      <AuthForm mode="sign-in" action={noopAction} />,
    );
    const marks = getAllByRole("img", { name: "Onyx" });
    expect(marks.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Onyx mark above the wordmark on sign-up", () => {
    const { getAllByRole } = render(
      <AuthForm mode="sign-up" action={noopAction} />,
    );
    const marks = getAllByRole("img", { name: "Onyx" });
    expect(marks.length).toBeGreaterThanOrEqual(1);
  });
});
