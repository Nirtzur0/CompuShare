import { z } from "zod";

const settingsSchema = z.object({
  workloadManifestSigningKey: z
    .string()
    .min(32, "WORKLOAD_MANIFEST_SIGNING_KEY must be at least 32 characters."),
  workloadManifestSigningKeyId: z
    .string()
    .min(3, "WORKLOAD_MANIFEST_SIGNING_KEY_ID is required."),
  workloadManifestSigningIdentity: z
    .string()
    .min(3, "WORKLOAD_MANIFEST_SIGNING_IDENTITY is required.")
});

export type WorkloadManifestProvenanceSettings = z.infer<typeof settingsSchema>;

export function loadWorkloadManifestProvenanceSettings(
  environment: NodeJS.ProcessEnv
): WorkloadManifestProvenanceSettings {
  return settingsSchema.parse({
    workloadManifestSigningKey: environment.WORKLOAD_MANIFEST_SIGNING_KEY,
    workloadManifestSigningKeyId: environment.WORKLOAD_MANIFEST_SIGNING_KEY_ID,
    workloadManifestSigningIdentity:
      environment.WORKLOAD_MANIFEST_SIGNING_IDENTITY
  });
}
