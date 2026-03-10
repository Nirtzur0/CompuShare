import { z } from "zod";

const settingsSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.coerce.number().int().positive().default(3200),
  controlPlaneBaseUrl: z.url(),
  providerRuntimeApiKey: z
    .string()
    .min(24, "PROVIDER_RUNTIME_API_KEY must be at least 24 characters.")
    .optional(),
  privateConnectorOrganizationId: z.uuid().optional(),
  privateConnectorEnvironment: z
    .enum(["development", "staging", "production"])
    .optional(),
  privateConnectorId: z.uuid().optional(),
  privateConnectorMode: z.enum(["cluster", "byok_api"]).optional(),
  privateConnectorForwardBaseUrl: z.url().optional(),
  privateConnectorUpstreamApiKey: z.string().min(16).optional(),
  privateConnectorOrgApiKey: z.string().min(24).optional(),
  privateConnectorRuntimeVersion: z.string().min(1).default("local"),
  privateConnectorHeartbeatIntervalMs: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),
});

export type ProviderRuntimeSettings = z.infer<typeof settingsSchema>;

export function loadProviderRuntimeSettings(
  environment: NodeJS.ProcessEnv,
): ProviderRuntimeSettings {
  return settingsSchema.parse({
    host: environment.HOST,
    port: environment.PORT,
    controlPlaneBaseUrl: environment.CONTROL_PLANE_BASE_URL,
    providerRuntimeApiKey: environment.PROVIDER_RUNTIME_API_KEY,
    privateConnectorOrganizationId:
      environment.PRIVATE_CONNECTOR_ORGANIZATION_ID,
    privateConnectorEnvironment: environment.PRIVATE_CONNECTOR_ENVIRONMENT,
    privateConnectorId: environment.PRIVATE_CONNECTOR_ID,
    privateConnectorMode: environment.PRIVATE_CONNECTOR_MODE,
    privateConnectorForwardBaseUrl: environment.PRIVATE_CONNECTOR_FORWARD_BASE_URL,
    privateConnectorUpstreamApiKey:
      environment.PRIVATE_CONNECTOR_UPSTREAM_API_KEY,
    privateConnectorOrgApiKey: environment.PRIVATE_CONNECTOR_ORG_API_KEY,
    privateConnectorRuntimeVersion:
      environment.PRIVATE_CONNECTOR_RUNTIME_VERSION,
    privateConnectorHeartbeatIntervalMs:
      environment.PRIVATE_CONNECTOR_HEARTBEAT_INTERVAL_MS,
  });
}
