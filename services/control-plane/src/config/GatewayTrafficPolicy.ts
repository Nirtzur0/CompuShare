import { z } from "zod";
import { DomainValidationError } from "../domain/identity/DomainValidationError.js";

const gatewayTrafficPolicySchema = z.object({
  syncRequestsPerMinutePerApiKey: z.coerce.number().int().positive().default(60),
  fixedDayTokenQuotaPerOrganizationEnvironment: z.coerce
    .number()
    .int()
    .positive()
    .default(2_000_000),
  maxBatchItemsPerJob: z.coerce.number().int().positive().default(500),
  maxActiveBatchesPerOrganizationEnvironment: z.coerce
    .number()
    .int()
    .positive()
    .default(5),
  defaultChatMaxTokensReservation: z.coerce
    .number()
    .int()
    .positive()
    .default(4_096)
});

export type GatewayTrafficPolicySettings = z.infer<
  typeof gatewayTrafficPolicySchema
>;

export class GatewayTrafficPolicy {
  private constructor(
    public readonly syncRequestsPerMinutePerApiKey: number,
    public readonly fixedDayTokenQuotaPerOrganizationEnvironment: number,
    public readonly maxBatchItemsPerJob: number,
    public readonly maxActiveBatchesPerOrganizationEnvironment: number,
    public readonly defaultChatMaxTokensReservation: number
  ) {}

  public static createDefault(): GatewayTrafficPolicy {
    const settings = gatewayTrafficPolicySchema.parse({});
    return new GatewayTrafficPolicy(
      settings.syncRequestsPerMinutePerApiKey,
      settings.fixedDayTokenQuotaPerOrganizationEnvironment,
      settings.maxBatchItemsPerJob,
      settings.maxActiveBatchesPerOrganizationEnvironment,
      settings.defaultChatMaxTokensReservation
    );
  }

  public static load(environment: NodeJS.ProcessEnv): GatewayTrafficPolicy {
    const settings = gatewayTrafficPolicySchema.parse({
      syncRequestsPerMinutePerApiKey:
        environment.GATEWAY_SYNC_REQUESTS_PER_MINUTE_PER_API_KEY,
      fixedDayTokenQuotaPerOrganizationEnvironment:
        environment.GATEWAY_FIXED_DAY_TOKEN_QUOTA_PER_ORG_ENV,
      maxBatchItemsPerJob: environment.GATEWAY_MAX_BATCH_ITEMS_PER_JOB,
      maxActiveBatchesPerOrganizationEnvironment:
        environment.GATEWAY_MAX_ACTIVE_BATCHES_PER_ORG_ENV,
      defaultChatMaxTokensReservation:
        environment.GATEWAY_DEFAULT_CHAT_MAX_TOKENS_RESERVATION
    });

    return new GatewayTrafficPolicy(
      settings.syncRequestsPerMinutePerApiKey,
      settings.fixedDayTokenQuotaPerOrganizationEnvironment,
      settings.maxBatchItemsPerJob,
      settings.maxActiveBatchesPerOrganizationEnvironment,
      settings.defaultChatMaxTokensReservation
    );
  }

  public validateBatchItemCount(itemCount: number): void {
    if (!Number.isInteger(itemCount) || itemCount < 1) {
      throw new DomainValidationError(
        "Gateway batch item counts must be positive integers."
      );
    }

    if (itemCount > this.maxBatchItemsPerJob) {
      throw new DomainValidationError(
        `Gateway batch jobs may not exceed ${String(
          this.maxBatchItemsPerJob
        )} items.`
      );
    }
  }
}
