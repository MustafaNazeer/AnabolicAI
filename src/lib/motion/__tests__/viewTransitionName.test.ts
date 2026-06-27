import { describe, it, expect } from "vitest";
import { viewTransitionName } from "@/lib/motion/viewTransitionName";

describe("viewTransitionName", () => {
  it("leaves UUID-shaped ids readable and unchanged after the prefix", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(viewTransitionName("routine-item", id)).toBe(`routine-item-${id}`);
  });

  it("only ever emits valid CSS custom-ident characters", () => {
    const id = "weird id.with/odd:chars%& and 你好";
    expect(viewTransitionName("routine-item", id)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never collapses distinct ids that a plain character strip would collide", () => {
    // A naive id.replace(/[^a-zA-Z0-9_-]/g, "") maps both of these to "ab".
    expect(viewTransitionName("p", "a.b")).not.toBe(viewTransitionName("p", "ab"));
  });

  it("escapes the underscore marker so it cannot alias an encoded character", () => {
    // "." encodes to a sequence containing underscores; a literal underscore id
    // must not be able to reproduce that same sequence.
    expect(viewTransitionName("p", ".")).not.toBe(viewTransitionName("p", "_2e_"));
  });

  it("is deterministic for the same id", () => {
    expect(viewTransitionName("p", "abc")).toBe(viewTransitionName("p", "abc"));
  });
});
