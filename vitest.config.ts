import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next.js enforces this at build time; in tests it's a no-op.
      "server-only": path.resolve(__dirname, "tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    testTimeout: 15_000,
    reporters: ["default", "json"],
    outputFile: { json: "reports/raw/vitest.json" },
  },
});
