import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, it, expect, vi } from "vitest";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

describe("ErrorRetry", () => {
  it("shows the message in an alert and retries on click", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ErrorRetry message="Couldn't save. Tap to retry." onRetry={onRetry} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save. Tap to retry.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("disables the button while pending", () => {
    render(<ErrorRetry message="x" onRetry={() => {}} pending />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
