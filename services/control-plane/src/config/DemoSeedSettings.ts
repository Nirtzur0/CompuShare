import { z } from "zod";

const demoSeedSettingsSchema = z.object({
  databaseUrl: z.preprocess(
    (value) => value ?? "",
    z.string().min(1, "DATABASE_URL is required.")
  ),
  controlPlaneBaseUrl: z
    .url("CONTROL_PLANE_BASE_URL must be a valid URL.")
    .default("http://127.0.0.1:3100"),
  providerRuntimeBaseUrl: z
    .url("PROVIDER_RUNTIME_BASE_URL must be a valid URL.")
    .default("http://127.0.0.1:3200"),
  providerRuntimeApiKey: z.preprocess(
    (value) => value ?? "csk_provider_runtime_local_seed_secret_000000",
    z
      .string()
      .min(24, "PROVIDER_RUNTIME_API_KEY must be at least 24 characters.")
  ),
  dashboardBaseUrl: z
    .url("DASHBOARD_BASE_URL must be a valid URL.")
    .default("http://127.0.0.1:3000")
});

export type DemoSeedSettings = z.infer<typeof demoSeedSettingsSchema>;

export function loadDemoSeedSettings(
  environment: NodeJS.ProcessEnv
): DemoSeedSettings {
  return demoSeedSettingsSchema.parse({
    databaseUrl: environment.DATABASE_URL,
    controlPlaneBaseUrl: environment.CONTROL_PLANE_BASE_URL,
    providerRuntimeBaseUrl: environment.PROVIDER_RUNTIME_BASE_URL,
    providerRuntimeApiKey: environment.PROVIDER_RUNTIME_API_KEY,
    dashboardBaseUrl: environment.DASHBOARD_BASE_URL
  });
}
