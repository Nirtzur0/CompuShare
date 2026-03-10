import { describe, expect, it } from "vitest";
import {
  FraudReviewAlert,
  type FraudReviewAlertSnapshot
} from "../../../../src/domain/fraud/FraudReviewAlert.js";
import { DomainValidationError } from "../../../../src/domain/identity/DomainValidationError.js";

function createSnapshot(
  overrides: Partial<FraudReviewAlertSnapshot> = {}
): FraudReviewAlertSnapshot {
  return {
    signalType: "shared_member_settlement",
    severity: "high",
    organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
    counterpartyOrganizationId: "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
    counterpartyOrganizationName: "Shared Provider",
    counterpartyOrganizationSlug: "shared-provider",
    reason: " Shared member overlap detected on settled activity. ",
    sharedMemberEmails: [
      "Shared@example.com",
      " shared@example.com ",
      "",
      "Ops@example.com"
    ],
    outgoingSettlementCount: 2,
    outgoingSettledUsd: "50.00",
    outgoingUsageEventCount: 0,
    outgoingUsageTotalTokens: 0,
    incomingSettlementCount: 0,
    incomingSettledUsd: "0.00",
    incomingUsageEventCount: 0,
    incomingUsageTotalTokens: 0,
    firstActivityAt: "2026-03-08T10:00:00.000Z",
    lastActivityAt: "2026-03-09T10:00:00.000Z",
    ...overrides
  };
}

describe("FraudReviewAlert", () => {
  it("normalizes reason and member emails defensively", () => {
    const alert = FraudReviewAlert.create(createSnapshot());
    const snapshot = alert.toSnapshot();

    expect(snapshot.reason).toBe(
      "Shared member overlap detected on settled activity."
    );
    expect(snapshot.sharedMemberEmails).toEqual([
      "ops@example.com",
      "shared@example.com"
    ]);

    snapshot.sharedMemberEmails.push("mutated@example.com");

    expect(alert.toSnapshot().sharedMemberEmails).toEqual([
      "ops@example.com",
      "shared@example.com"
    ]);
  });

  it("rejects unsupported signal types", () => {
    expect(() =>
      FraudReviewAlert.create(
        createSnapshot({
          signalType: "not-supported" as FraudReviewAlertSnapshot["signalType"]
        })
      )
    ).toThrow(DomainValidationError);
  });

  it("rejects unsupported severity values", () => {
    expect(() =>
      FraudReviewAlert.create(
        createSnapshot({
          severity: "low" as FraudReviewAlertSnapshot["severity"]
        })
      )
    ).toThrow(DomainValidationError);
  });

  it("rejects reasons outside the allowed range", () => {
    expect(() =>
      FraudReviewAlert.create(
        createSnapshot({
          reason: "short"
        })
      )
    ).toThrow(DomainValidationError);
  });
});
