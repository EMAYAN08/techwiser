import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "utils/**/*.test.ts"],
    testTimeout: 15_000,
    setupFiles: ["./vitest.setup.ts"],
  },
});
