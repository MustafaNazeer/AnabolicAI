import { describe, it, expect } from "vitest";
import { RIR_OPTIONS, rirLabel } from "@/lib/workout/rir";

describe("rir", () => {
  it("has six options, 0 through 5", () => {
    expect(RIR_OPTIONS.map((o) => o.value)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("maps values to the exact spec labels", () => {
    expect(rirLabel(0)).toBe("Nothing left");
    expect(rirLabel(3)).toBe("Comfortable");
    expect(rirLabel(5)).toBe("Very easy");
  });
});
