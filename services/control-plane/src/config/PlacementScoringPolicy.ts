import { DomainValidationError } from "../domain/identity/DomainValidationError.js";

export class PlacementScoringPolicy {
  private constructor(
    public readonly warmCacheMultiplier: number,
    public readonly maxWarmModelStateTtlMs: number
  ) {}

  public static createDefault(): PlacementScoringPolicy {
    return new PlacementScoringPolicy(1.15, 15 * 60 * 1000);
  }

  public validateWarmModelExpiry(expiresAt: Date, declaredAt: Date): void {
    const ttlMs = expiresAt.getTime() - declaredAt.getTime();

    if (ttlMs <= 0) {
      throw new DomainValidationError(
        "Warm model state expiry must be in the future."
      );
    }

    if (ttlMs > this.maxWarmModelStateTtlMs) {
      throw new DomainValidationError(
        "Warm model state expiry cannot exceed 15 minutes from declaration."
      );
    }
  }

  public resolveDisputePenaltyMultiplier(lostDisputeCount90d: number): number {
    if (!Number.isInteger(lostDisputeCount90d) || lostDisputeCount90d < 0) {
      throw new DomainValidationError(
        "Lost dispute counts must be non-negative integers."
      );
    }

    return Math.max(0.7, 1 - 0.1 * lostDisputeCount90d);
  }
}
