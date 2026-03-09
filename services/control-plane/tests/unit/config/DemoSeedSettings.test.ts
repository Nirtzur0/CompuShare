import { describe, expect, it } from "vitest";
import { loadDemoSeedSettings } from "../../../src/config/DemoSeedSettings.js";

describe("loadDemoSeedSettings", () => {
  it("loads the required database URL and defaults local base URLs", () => {
    const settings = loadDemoSeedSettings({
      DATABASE_URL: "postgres://compushare:compushare@127.0.0.1:5432/compushare"
    });

    expect(settings).toEqual({
      databaseUrl: "postgres://compushare:compushare@127.0.0.1:5432/compushare",
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeBaseUrl: "http://127.0.0.1:3200",
      providerRuntimeApiKey: "csk_provider_runtime_local_seed_secret_000000",
      dashboardBaseUrl: "http://127.0.0.1:3000"
    });
  });

  it("loads explicit provider runtime settings", () => {
    const settings = loadDemoSeedSettings({
      DATABASE_URL:
        "postgres://compushare:compushare@127.0.0.1:5432/compushare",
      CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3100",
      PROVIDER_RUNTIME_BASE_URL: "http://127.0.0.1:3200",
      PROVIDER_RUNTIME_API_KEY: "csk_provider_runtime_local_seed_secret_111111",
      DASHBOARD_BASE_URL: "http://127.0.0.1:3000"
    });

    expect(settings).toEqual({
      databaseUrl: "postgres://compushare:compushare@127.0.0.1:5432/compushare",
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeBaseUrl: "http://127.0.0.1:3200",
      providerRuntimeApiKey: "csk_provider_runtime_local_seed_secret_111111",
      dashboardBaseUrl: "http://127.0.0.1:3000"
    });
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadDemoSeedSettings({})).toThrow("DATABASE_URL is required.");
  });
});
