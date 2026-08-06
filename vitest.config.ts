import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Hidden directories hold local tooling state, including copies of this
    // tree, so collecting tests from them would run the wrong files. The end to
    // end specs need a browser and a running server, so they are excluded by
    // pattern rather than by directory, which keeps e2e/setup unit testable.
    exclude: [...configDefaults.exclude, "**/.*/**", "e2e/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // Count every source file, not just the ones a test happens to import.
      // Without this the percentage silently omits untested files entirely and
      // reads far higher than the truth.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Without this the five modules importing `server-only` cannot load under
      // Vitest, so coverage drops them from the report entirely. All five are
      // untested, so their absence inflated the percentage. See the stub file.
      "server-only": path.resolve(__dirname, "./vitest.server-only-stub.ts"),
    },
  },
});
