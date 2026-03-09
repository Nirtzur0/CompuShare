import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      exclude: [
        "eslint.config.js",
        "src/application/identity/ports/**",
        "src/domain/identity/OrganizationRole.ts",
        "src/interfaces/http/startServer.ts",
        "vitest.config.ts"
      ],
      reporter: ["text", "html"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90
      }
    }
  }
});
