import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    // Integration tests hit a real (sometimes cold-starting, free-tier) Postgres instance —
    // give them more headroom than the 5s/10s vitest defaults.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
