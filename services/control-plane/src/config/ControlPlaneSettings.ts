import { z } from "zod";

const settingsSchema = z.object({
  host: z.string().default("0.0.0.0"),
  port: z.coerce.number().int().positive().default(3000),
  databaseUrl: z.string().min(1, "DATABASE_URL is required."),
  workloadBundleSigningKey: z
    .string()
    .min(32, "WORKLOAD_BUNDLE_SIGNING_KEY must be at least 32 characters."),
  workloadBundleSigningKeyId: z
    .string()
    .min(3, "WORKLOAD_BUNDLE_SIGNING_KEY_ID is required."),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  stripeConnectReturnUrlBase: z.url().optional(),
  stripeConnectRefreshUrlBase: z.url().optional()
});

export type ControlPlaneSettings = z.infer<typeof settingsSchema>;

export function loadControlPlaneSettings(
  environment: NodeJS.ProcessEnv
): ControlPlaneSettings {
  return settingsSchema.parse({
    host: environment.HOST,
    port: environment.PORT,
    databaseUrl: environment.DATABASE_URL,
    workloadBundleSigningKey: environment.WORKLOAD_BUNDLE_SIGNING_KEY,
    workloadBundleSigningKeyId: environment.WORKLOAD_BUNDLE_SIGNING_KEY_ID,
    stripeSecretKey: environment.STRIPE_SECRET_KEY,
    stripeWebhookSecret: environment.STRIPE_WEBHOOK_SECRET,
    stripeConnectReturnUrlBase: environment.STRIPE_CONNECT_RETURN_URL_BASE,
    stripeConnectRefreshUrlBase: environment.STRIPE_CONNECT_REFRESH_URL_BASE
  });
}
