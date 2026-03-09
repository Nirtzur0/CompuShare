import { describe, expect, it } from "vitest";
import { loadProviderRuntimeSettings } from "../../../src/config/ProviderRuntimeSettings.js";

describe("ProviderRuntimeSettings", () => {
  it("loads explicit provider runtime settings", () => {
    expect(
      loadProviderRuntimeSettings({
        HOST: "0.0.0.0",
        PORT: "3300",
        CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3100",
        PROVIDER_RUNTIME_API_KEY:
          "csk_provider_runtime_local_seed_secret_000000",
      }),
    ).toEqual({
      host: "0.0.0.0",
      port: 3300,
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeApiKey: "csk_provider_runtime_local_seed_secret_000000",
    });
  });

  it("defaults host and port", () => {
    expect(
      loadProviderRuntimeSettings({
        CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3100",
        PROVIDER_RUNTIME_API_KEY:
          "csk_provider_runtime_local_seed_secret_000000",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 3200,
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeApiKey: "csk_provider_runtime_local_seed_secret_000000",
    });
  });
});
