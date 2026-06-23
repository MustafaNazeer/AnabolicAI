// src/components/__tests__/ThemePicker.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemePicker } from "@/components/ThemePicker";

describe("ThemePicker", () => {
  beforeEach(() => localStorage.clear());

  it("renders the five themes and switches on click", async () => {
    render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>,
    );
    for (const name of ["Cobalt", "Emerald", "Magenta", "Crimson", "Rose"]) {
      expect(screen.getByRole("button", { name: new RegExp(name, "i") })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: /Emerald/i }));
    expect(localStorage.getItem("onyx-theme")).toBe("emerald");
  });
});
