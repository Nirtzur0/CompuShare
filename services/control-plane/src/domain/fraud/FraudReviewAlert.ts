import { DomainValidationError } from "../identity/DomainValidationError.js";

export const fraudReviewAlertSignalValues = [
  "self_settlement",
  "shared_member_settlement",
  "settlement_without_usage",
  "counterparty_concentration"
] as const;

export type FraudReviewAlertSignal =
  (typeof fraudReviewAlertSignalValues)[number];

export const fraudReviewAlertSeverityValues = ["high", "medium"] as const;

export type FraudReviewAlertSeverity =
  (typeof fraudReviewAlertSeverityValues)[number];

export interface FraudReviewAlertSnapshot {
  signalType: FraudReviewAlertSignal;
  severity: FraudReviewAlertSeverity;
  organizationId: string;
  counterpartyOrganizationId: string;
  counterpartyOrganizationName: string;
  counterpartyOrganizationSlug: string;
  reason: string;
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

export class FraudReviewAlert {
  private constructor(private readonly snapshot: FraudReviewAlertSnapshot) {}

  public static create(input: FraudReviewAlertSnapshot): FraudReviewAlert {
    if (!fraudReviewAlertSignalValues.includes(input.signalType)) {
      throw new DomainValidationError(
        `Unsupported fraud review alert signal: ${input.signalType}.`
      );
    }

    if (!fraudReviewAlertSeverityValues.includes(input.severity)) {
      throw new DomainValidationError(
        `Unsupported fraud review alert severity: ${input.severity}.`
      );
    }

    const reason = input.reason.trim();

    if (reason.length < 8 || reason.length > 240) {
      throw new DomainValidationError(
        "Fraud review alert reasons must be between 8 and 240 characters."
      );
    }

    return new FraudReviewAlert({
      ...input,
      reason,
      sharedMemberEmails: [
        ...new Set(
          input.sharedMemberEmails
            .map((email) => email.trim().toLowerCase())
            .filter((email) => email.length > 0)
        )
      ].sort()
    });
  }

  public toSnapshot(): FraudReviewAlertSnapshot {
    return {
      ...this.snapshot,
      sharedMemberEmails: [...this.snapshot.sharedMemberEmails]
    };
  }
}
