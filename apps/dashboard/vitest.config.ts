import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      exclude: [
        "app/**/*.tsx",
        "eslint.config.js",
        "next-env.d.ts",
        "next.config.ts",
        "vitest.config.ts",
      ],
      reporter: ["text", "html"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
});
