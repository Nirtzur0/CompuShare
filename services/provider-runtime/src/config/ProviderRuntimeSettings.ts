import { z } from "zod";

const settingsSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.coerce.number().int().positive().default(3200),
  controlPlaneBaseUrl: z.url(),
  providerRuntimeApiKey: z
    .string()
    .min(24, "PROVIDER_RUNTIME_API_KEY must be at least 24 characters."),
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
  });
}
