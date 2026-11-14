import path from "node:path";
import { defineConfig } from "vitest/config";

/* Unit and integration tests in tests/ (not next to the code: every non-underscore file in
   api/ would become a deployed Vercel function). External services are stubbed per test file. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@api": path.resolve(import.meta.dirname, "api/_lib"),
    },
  },
  test: {
    include: ["tests/**/*.test.{js,ts}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["api/**/*.ts", "src/**/*.{ts,tsx}"],
      exclude: ["src/shared/ui/primitives/**", "**/*.d.ts"],
      reporter: ["text-summary", "lcov"],
    },
  },
});
