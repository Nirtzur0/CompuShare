import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import { OrganizationSlug } from "../identity/OrganizationSlug.js";
import { UsdAmount } from "../ledger/UsdAmount.js";

export interface FraudGraphCounterpartyExposureSnapshot {
  organizationId: string;
  counterpartyOrganizationId: string;
  counterpartyOrganizationName: string;
  counterpartyOrganizationSlug: string;
  sharedMemberEmails: string[];
  outgoingSettlementCount: number;
  outgoingSettledUsd: string;
  outgoingUsageEventCount: number;
  outgoingUsageTotalTokens: number;
  incomingSettlementCount: number;
  incomingSettledUsd: string;
  incomingUsageEventCount: number;
  incomingUsageTotalTokens: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
}

export class FraudGraphCounterpartyExposure {
  private constructor(
    public readonly organizationId: OrganizationId,
    public readonly counterpartyOrganizationId: OrganizationId,
    public readonly counterpartyOrganizationName: string,
    public readonly counterpartyOrganizationSlug: OrganizationSlug,
    public readonly sharedMemberEmails: readonly string[],
    public readonly outgoingSettlementCount: number,
    public readonly outgoingSettled: UsdAmount,
    public readonly outgoingUsageEventCount: number,
    public readonly outgoingUsageTotalTokens: number,
    public readonly incomingSettlementCount: number,
    public readonly incomingSettled: UsdAmount,
    public readonly incomingUsageEventCount: number,
    public readonly incomingUsageTotalTokens: number,
    public readonly firstActivityAt: Date | null,
    public readonly lastActivityAt: Date | null
  ) {}

  public static create(
    input: FraudGraphCounterpartyExposureSnapshot
  ): FraudGraphCounterpartyExposure {
    const counterpartyOrganizationName = input.counterpartyOrganizationName.trim();

    if (
      counterpartyOrganizationName.length < 3 ||
      counterpartyOrganizationName.length > 120
    ) {
      throw new DomainValidationError(
        "Counterparty organization names must be between 3 and 120 characters."
      );
    }

    for (const value of [
      input.outgoingSettlementCount,
      input.outgoingUsageEventCount,
      input.outgoingUsageTotalTokens,
      input.incomingSettlementCount,
      input.incomingUsageEventCount,
      input.incomingUsageTotalTokens
    ]) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new DomainValidationError(
          "Fraud graph counts and token totals must be non-negative safe integers."
        );
      }
    }

    const sharedMemberEmails = [
      ...new Set(
        input.sharedMemberEmails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0)
      )
    ].sort();

    return new FraudGraphCounterpartyExposure(
      OrganizationId.create(input.organizationId),
      OrganizationId.create(input.counterpartyOrganizationId),
      counterpartyOrganizationName,
      OrganizationSlug.create(input.counterpartyOrganizationSlug),
      sharedMemberEmails,
      input.outgoingSettlementCount,
      UsdAmount.parse(input.outgoingSettledUsd),
      input.outgoingUsageEventCount,
      input.outgoingUsageTotalTokens,
      input.incomingSettlementCount,
      UsdAmount.parse(input.incomingSettledUsd),
      input.incomingUsageEventCount,
      input.incomingUsageTotalTokens,
      input.firstActivityAt === null ? null : new Date(input.firstActivityAt),
      input.lastActivityAt === null ? null : new Date(input.lastActivityAt)
    );
  }

  public toSnapshot(): FraudGraphCounterpartyExposureSnapshot {
    return {
      organizationId: this.organizationId.value,
      counterpartyOrganizationId: this.counterpartyOrganizationId.value,
      counterpartyOrganizationName: this.counterpartyOrganizationName,
      counterpartyOrganizationSlug: this.counterpartyOrganizationSlug.value,
      sharedMemberEmails: [...this.sharedMemberEmails],
      outgoingSettlementCount: this.outgoingSettlementCount,
      outgoingSettledUsd: this.outgoingSettled.toUsdString(),
      outgoingUsageEventCount: this.outgoingUsageEventCount,
      outgoingUsageTotalTokens: this.outgoingUsageTotalTokens,
      incomingSettlementCount: this.incomingSettlementCount,
      incomingSettledUsd: this.incomingSettled.toUsdString(),
      incomingUsageEventCount: this.incomingUsageEventCount,
      incomingUsageTotalTokens: this.incomingUsageTotalTokens,
      firstActivityAt: this.firstActivityAt?.toISOString() ?? null,
      lastActivityAt: this.lastActivityAt?.toISOString() ?? null
    };
  }
}
