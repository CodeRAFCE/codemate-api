import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // fileParallelism: false, // run test files one after another, not in parallel
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    env: { JWT_SECRET: "test-secret" },
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/config/database.ts", "src/types/**"],
      reporter: ["text", "html"],
    },
  },
});
