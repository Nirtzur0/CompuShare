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
      privateConnectorOrganizationId: undefined,
      privateConnectorEnvironment: undefined,
      privateConnectorId: undefined,
      privateConnectorMode: undefined,
      privateConnectorForwardBaseUrl: undefined,
      privateConnectorUpstreamApiKey: undefined,
      privateConnectorOrgApiKey: undefined,
      privateConnectorRuntimeVersion: "local",
      privateConnectorHeartbeatIntervalMs: 30_000,
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
      privateConnectorOrganizationId: undefined,
      privateConnectorEnvironment: undefined,
      privateConnectorId: undefined,
      privateConnectorMode: undefined,
      privateConnectorForwardBaseUrl: undefined,
      privateConnectorUpstreamApiKey: undefined,
      privateConnectorOrgApiKey: undefined,
      privateConnectorRuntimeVersion: "local",
      privateConnectorHeartbeatIntervalMs: 30_000,
    });
  });

  it("loads explicit private connector settings", () => {
    expect(
      loadProviderRuntimeSettings({
        CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3100",
        PRIVATE_CONNECTOR_ORGANIZATION_ID:
          "2ff087f2-6d61-4d5f-a8f9-278639797311",
        PRIVATE_CONNECTOR_ENVIRONMENT: "staging",
        PRIVATE_CONNECTOR_ID: "81b7632a-f71d-4436-8468-dc0ed837a0c1",
        PRIVATE_CONNECTOR_MODE: "byok_api",
        PRIVATE_CONNECTOR_FORWARD_BASE_URL: "https://api.example.com",
        PRIVATE_CONNECTOR_UPSTREAM_API_KEY: "upstream-secret-key",
        PRIVATE_CONNECTOR_ORG_API_KEY:
          "csk_private_connector_runtime_secret_000000",
        PRIVATE_CONNECTOR_RUNTIME_VERSION: "runtime-2026.03.10",
        PRIVATE_CONNECTOR_HEARTBEAT_INTERVAL_MS: "45000",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 3200,
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeApiKey: undefined,
      privateConnectorOrganizationId:
        "2ff087f2-6d61-4d5f-a8f9-278639797311",
      privateConnectorEnvironment: "staging",
      privateConnectorId: "81b7632a-f71d-4436-8468-dc0ed837a0c1",
      privateConnectorMode: "byok_api",
      privateConnectorForwardBaseUrl: "https://api.example.com",
      privateConnectorUpstreamApiKey: "upstream-secret-key",
      privateConnectorOrgApiKey:
        "csk_private_connector_runtime_secret_000000",
      privateConnectorRuntimeVersion: "runtime-2026.03.10",
      privateConnectorHeartbeatIntervalMs: 45_000,
    });
  });
});
