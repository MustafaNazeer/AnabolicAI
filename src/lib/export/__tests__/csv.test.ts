import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/export/csv";

describe("toCsv", () => {
  it("writes a header row and a data row", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe("a,b\r\n1,2");
  });

  it("writes the header alone when there are no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });

  // A custom exercise name is free text, so all three of these are reachable
  // and each one splits a row in Sheets if it goes out unescaped.
  it("quotes a field containing a comma", () => {
    expect(toCsv(["a"], [["one, two"]])).toBe('a\r\n"one, two"');
  });

  it("doubles a quote inside a quoted field", () => {
    expect(toCsv(["a"], [['say "hi"']])).toBe('a\r\n"say ""hi"""');
  });

  it("quotes a field containing a newline", () => {
    expect(toCsv(["a"], [["one\ntwo"]])).toBe('a\r\n"one\ntwo"');
  });

  it("handles a field containing all three at once", () => {
    expect(toCsv(["a"], [['x, "y"\nz']])).toBe('a\r\n"x, ""y""\nz"');
  });

  it("leaves an ordinary field unquoted", () => {
    expect(toCsv(["a"], [["Bench Press"]])).toBe("a\r\nBench Press");
  });

  it("keeps an empty field empty rather than quoting it", () => {
    expect(toCsv(["a", "b"], [["", "1"]])).toBe("a,b\r\n,1");
  });
});
