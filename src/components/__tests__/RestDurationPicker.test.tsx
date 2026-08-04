import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { RestDurationPicker } from "@/components/RestDurationPicker";

function setup(seconds: number) {
  const onPick = vi.fn();
  const onCancel = vi.fn();
  render(
    <RestDurationPicker seconds={seconds} onPick={onPick} onCancel={onCancel} />,
  );
  return {
    onPick,
    onCancel,
    minutes: () => screen.getByRole("textbox", { name: "Minutes" }),
    seconds: () => screen.getByRole("textbox", { name: "Seconds" }),
    set: () => screen.getByRole("button", { name: /^Set duration/ }),
    cancel: () => screen.getByRole("button", { name: "Cancel duration change" }),
  };
}

describe("RestDurationPicker", () => {
  // A round two minutes seeds a visible 0 rather than a blank, so the value on
  // screen is the value the timer holds.
  it("seeds both boxes from the duration it was given", () => {
    const s = setup(150);
    expect(s.minutes()).toHaveValue("2");
    expect(s.seconds()).toHaveValue("30");
  });

  it("seeds a zero seconds box rather than leaving it blank", () => {
    const s = setup(120);
    expect(s.minutes()).toHaveValue("2");
    expect(s.seconds()).toHaveValue("0");
  });

  it("reports what was typed when Set is pressed", () => {
    const s = setup(120);
    fireEvent.change(s.minutes(), { target: { value: "3" } });
    fireEvent.change(s.seconds(), { target: { value: "20" } });
    fireEvent.click(s.set());
    expect(s.onPick).toHaveBeenCalledWith(200);
  });

  it("treats a blank seconds box as zero", () => {
    const s = setup(120);
    fireEvent.change(s.minutes(), { target: { value: "3" } });
    fireEvent.change(s.seconds(), { target: { value: "" } });
    fireEvent.click(s.set());
    expect(s.onPick).toHaveBeenCalledWith(180);
  });

  it("treats a blank minutes box as zero", () => {
    const s = setup(120);
    fireEvent.change(s.minutes(), { target: { value: "" } });
    fireEvent.change(s.seconds(), { target: { value: "45" } });
    fireEvent.click(s.set());
    expect(s.onPick).toHaveBeenCalledWith(45);
  });

  // Mustafa's choice: an empty pair commits nothing and simply closes.
  it("closes without changing anything when both boxes are blank", () => {
    const s = setup(120);
    fireEvent.change(s.minutes(), { target: { value: "" } });
    fireEvent.change(s.seconds(), { target: { value: "" } });
    fireEvent.click(s.set());
    expect(s.onPick).not.toHaveBeenCalled();
    expect(s.onCancel).toHaveBeenCalled();
  });

  // Filtering on the way in means there is no invalid state to report.
  it("refuses anything that is not a digit", () => {
    const s = setup(120);
    fireEvent.change(s.minutes(), { target: { value: "a2b" } });
    expect(s.minutes()).toHaveValue("2");
  });

  it("caps each box at two digits", () => {
    const s = setup(120);
    fireEvent.change(s.seconds(), { target: { value: "1234" } });
    expect(s.seconds()).toHaveValue("12");
  });

  // aria-valuetext has no meaning on a text box, so the plain language moved
  // here. This is what a screen reader user hears before committing.
  it("names the Set button with the duration in words", () => {
    setup(150);
    expect(
      screen.getByRole("button", { name: "Set duration to 2 minutes 30 seconds" }),
    ).toBeInTheDocument();
  });

  it("cancels without reporting anything", () => {
    const s = setup(120);
    fireEvent.change(s.minutes(), { target: { value: "5" } });
    fireEvent.click(s.cancel());
    expect(s.onCancel).toHaveBeenCalled();
    expect(s.onPick).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <RestDurationPicker seconds={120} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
