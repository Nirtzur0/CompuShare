import { DomainValidationError } from "../identity/DomainValidationError.js";

export interface ProviderWarmModelStateSnapshot {
  approvedModelAlias: string;
  declaredAt: string;
  expiresAt: string;
}

export class ProviderWarmModelState {
  private constructor(
    public readonly approvedModelAlias: string,
    public readonly declaredAt: Date,
    public readonly expiresAt: Date
  ) {}

  public static declare(input: {
    approvedModelAlias: string;
    declaredAt: Date;
    expiresAt: Date;
  }): ProviderWarmModelState {
    const approvedModelAlias = this.validateApprovedModelAlias(
      input.approvedModelAlias
    );

    if (input.expiresAt.getTime() <= input.declaredAt.getTime()) {
      throw new DomainValidationError(
        "Warm model state expiry must be later than its declaration time."
      );
    }

    return new ProviderWarmModelState(
      approvedModelAlias,
      input.declaredAt,
      input.expiresAt
    );
  }

  public static rehydrate(input: {
    approvedModelAlias: string;
    declaredAt: Date;
    expiresAt: Date;
  }): ProviderWarmModelState {
    return this.declare(input);
  }

  public isExpired(at: Date): boolean {
    return this.expiresAt.getTime() <= at.getTime();
  }

  public toSnapshot(): ProviderWarmModelStateSnapshot {
    return {
      approvedModelAlias: this.approvedModelAlias,
      declaredAt: this.declaredAt.toISOString(),
      expiresAt: this.expiresAt.toISOString()
    };
  }

  private static validateApprovedModelAlias(rawValue: string): string {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 3 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "Approved model alias must be between 3 and 120 characters."
      );
    }

    return normalizedValue;
  }
}
