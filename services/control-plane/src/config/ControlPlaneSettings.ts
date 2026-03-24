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
  complianceLegalEntityName: z
    .string()
    .min(1, "COMPLIANCE_LEGAL_ENTITY_NAME is required."),
  compliancePrivacyEmail: z.email(
    "COMPLIANCE_PRIVACY_EMAIL must be a valid email address."
  ),
  complianceSecurityEmail: z.email(
    "COMPLIANCE_SECURITY_EMAIL must be a valid email address."
  ),
  complianceDpaEffectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "COMPLIANCE_DPA_EFFECTIVE_DATE must use YYYY-MM-DD."),
  complianceDpaVersion: z
    .string()
    .min(1, "COMPLIANCE_DPA_VERSION is required."),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  stripeDisputeWebhookSecret: z.string().optional(),
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
    complianceLegalEntityName: environment.COMPLIANCE_LEGAL_ENTITY_NAME,
    compliancePrivacyEmail: environment.COMPLIANCE_PRIVACY_EMAIL,
    complianceSecurityEmail: environment.COMPLIANCE_SECURITY_EMAIL,
    complianceDpaEffectiveDate: environment.COMPLIANCE_DPA_EFFECTIVE_DATE,
    complianceDpaVersion: environment.COMPLIANCE_DPA_VERSION,
    stripeSecretKey: environment.STRIPE_SECRET_KEY,
    stripeWebhookSecret: environment.STRIPE_WEBHOOK_SECRET,
    stripeDisputeWebhookSecret: environment.STRIPE_DISPUTE_WEBHOOK_SECRET,
    stripeConnectReturnUrlBase: environment.STRIPE_CONNECT_RETURN_URL_BASE,
    stripeConnectRefreshUrlBase: environment.STRIPE_CONNECT_REFRESH_URL_BASE
  });
}
