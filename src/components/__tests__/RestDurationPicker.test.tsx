import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { RestDurationPicker } from "@/components/RestDurationPicker";

describe("RestDurationPicker", () => {
  it("starts on the duration it was given", () => {
    render(
      <RestDurationPicker seconds={150} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
    const secs = screen.getByRole("spinbutton", { name: "Seconds" });
    expect(minutes).toHaveAttribute("aria-valuenow", "2");
    expect(secs).toHaveAttribute("aria-valuenow", "30");
  });

  // A screen reader announcing "150" tells you nothing.
  it("announces the whole duration in words", () => {
    render(
      <RestDurationPicker seconds={150} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole("group", { name: "Rest duration" })).toHaveAttribute(
      "aria-label",
      "Rest duration",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Minutes" }),
    ).toHaveAttribute("aria-valuetext", "2 minutes 30 seconds");
  });

  it("changes the minutes with the arrow keys", () => {
    render(
      <RestDurationPicker seconds={120} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });

    fireEvent.keyDown(minutes, { key: "ArrowUp" });
    expect(minutes).toHaveAttribute("aria-valuenow", "3");
    fireEvent.keyDown(minutes, { key: "ArrowDown" });
    fireEvent.keyDown(minutes, { key: "ArrowDown" });
    expect(minutes).toHaveAttribute("aria-valuenow", "1");
  });

  it("changes the seconds in five second steps", () => {
    render(
      <RestDurationPicker seconds={120} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    const secs = screen.getByRole("spinbutton", { name: "Seconds" });

    fireEvent.keyDown(secs, { key: "ArrowUp" });
    expect(secs).toHaveAttribute("aria-valuenow", "5");
    fireEvent.keyDown(secs, { key: "ArrowDown" });
    expect(secs).toHaveAttribute("aria-valuenow", "0");
  });

  it("does not run past either end", () => {
    render(
      <RestDurationPicker seconds={5} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
    fireEvent.keyDown(minutes, { key: "ArrowDown" });
    expect(minutes).toHaveAttribute("aria-valuenow", "0");

    fireEvent.keyDown(minutes, { key: "End" });
    expect(minutes).toHaveAttribute("aria-valuenow", "15");
    fireEvent.keyDown(minutes, { key: "ArrowUp" });
    expect(minutes).toHaveAttribute("aria-valuenow", "15");
  });

  // Spinning must not commit anything. Only Set does.
  it("reports the chosen duration only when Set is pressed", () => {
    const onPick = vi.fn();
    render(
      <RestDurationPicker seconds={120} onPick={onPick} onCancel={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Minutes" }), {
      key: "ArrowUp",
    });
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Set duration" }));
    expect(onPick).toHaveBeenCalledWith(180);
  });

  it("cancels without reporting anything", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(
      <RestDurationPicker seconds={120} onPick={onPick} onCancel={onCancel} />,
    );
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Minutes" }), {
      key: "ArrowUp",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel duration change" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it("refuses to set a zero length rest", () => {
    const onPick = vi.fn();
    render(
      <RestDurationPicker seconds={5} onPick={onPick} onCancel={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Seconds" }), {
      key: "ArrowDown",
    });
    fireEvent.click(screen.getByRole("button", { name: "Set duration" }));

    // Zero minutes and zero seconds is clamped up to the floor, never reported
    // as zero.
    expect(onPick).toHaveBeenCalledWith(5);
  });

  // This is the app's first custom widget, so it gets checked directly.
  it("has no accessibility violations", async () => {
    const { container } = render(
      <RestDurationPicker seconds={120} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
