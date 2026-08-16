import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AuthForm } from "../AuthForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const noopAction = async () => {};

describe("AuthForm brand", () => {
  it("shows the AnabolicAI mark above the wordmark on sign-in", () => {
    const { container } = render(
      <AuthForm mode="sign-in" action={noopAction} />,
    );
    // The mark is inside aria-hidden="true" so getByRole won't find it —
    // query the DOM directly. The SVG must be present in the tree.
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
  });

  it("shows the AnabolicAI mark above the wordmark on sign-up", () => {
    const { container } = render(
      <AuthForm mode="sign-up" action={noopAction} />,
    );
    // The mark is inside aria-hidden="true" so getByRole won't find it —
    // query the DOM directly. The SVG must be present in the tree.
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
  });
});
