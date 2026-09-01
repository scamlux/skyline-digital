import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests for framework-agnostic logic in src/lib (audit guard, scoring,
 * URL normalisation, measure against a local fixture server). Node environment
 * — these modules never touch the DOM. Next.js pages/components are covered by
 * build + manual checks, not vitest.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
