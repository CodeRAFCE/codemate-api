import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    env: { JWT_SECRET: "test-secret" },
    hookTimeout: 60_000,
  },
});
