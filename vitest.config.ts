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
    // tree, so collecting tests from them would run the wrong files.
    exclude: [...configDefaults.exclude, "**/.*/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
