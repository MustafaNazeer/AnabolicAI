import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { appName } from "@/lib/app";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("the display name has one definition", () => {
  it("appears as a literal only in src/lib/app.ts", () => {
    const offenders = sourceFiles("src")
      .filter((f) => f !== join("src", "lib", "app.ts"))
      .filter((f) => !f.includes("__tests__"))
      .filter((f) => readFileSync(f, "utf8").includes(`"${appName}"`));
    // Import appName instead of writing the string. See docs/rename.md.
    expect(offenders).toEqual([]);
  });
});
