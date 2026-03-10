import { describe, expect, it } from "vitest";
import { FraudGraphCounterpartyExposure } from "../../../../src/domain/fraud/FraudGraphCounterpartyExposure.js";
import { DomainValidationError } from "../../../../src/domain/identity/DomainValidationError.js";

describe("FraudGraphCounterpartyExposure", () => {
  it("normalizes member emails and preserves null activity bounds", () => {
    const exposure = FraudGraphCounterpartyExposure.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      counterpartyOrganizationId: "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
      counterpartyOrganizationName: " Shared Provider ",
      counterpartyOrganizationSlug: "shared-provider",
      sharedMemberEmails: [
        "Shared@example.com",
        " shared@example.com ",
        "",
        "Ops@example.com"
      ],
      outgoingSettlementCount: 2,
      outgoingSettledUsd: "50.00",
      outgoingUsageEventCount: 1,
      outgoingUsageTotalTokens: 1200,
      incomingSettlementCount: 1,
      incomingSettledUsd: "20.00",
      incomingUsageEventCount: 1,
      incomingUsageTotalTokens: 800,
      firstActivityAt: null,
      lastActivityAt: null
    });

    const snapshot = exposure.toSnapshot();

    expect(snapshot.counterpartyOrganizationName).toBe("Shared Provider");
    expect(snapshot.sharedMemberEmails).toEqual([
      "ops@example.com",
      "shared@example.com"
    ]);
    expect(snapshot.firstActivityAt).toBeNull();
    expect(snapshot.lastActivityAt).toBeNull();
  });

  it("rejects counterparty names outside the allowed range", () => {
    expect(() =>
      FraudGraphCounterpartyExposure.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        counterpartyOrganizationId: "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
        counterpartyOrganizationName: "ab",
        counterpartyOrganizationSlug: "shared-provider",
        sharedMemberEmails: [],
        outgoingSettlementCount: 0,
        outgoingSettledUsd: "0.00",
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 0,
        incomingSettledUsd: "0.00",
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: null,
        lastActivityAt: null
      })
    ).toThrow(DomainValidationError);
  });

  it("rejects non-safe and negative fraud graph counters", () => {
    expect(() =>
      FraudGraphCounterpartyExposure.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        counterpartyOrganizationId: "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
        counterpartyOrganizationName: "Shared Provider",
        counterpartyOrganizationSlug: "shared-provider",
        sharedMemberEmails: [],
        outgoingSettlementCount: Number.MAX_SAFE_INTEGER + 1,
        outgoingSettledUsd: "0.00",
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 0,
        incomingSettledUsd: "0.00",
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: null,
        lastActivityAt: null
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      FraudGraphCounterpartyExposure.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        counterpartyOrganizationId: "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
        counterpartyOrganizationName: "Shared Provider",
        counterpartyOrganizationSlug: "shared-provider",
        sharedMemberEmails: [],
        outgoingSettlementCount: 0,
        outgoingSettledUsd: "0.00",
        outgoingUsageEventCount: -1,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 0,
        incomingSettledUsd: "0.00",
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: null,
        lastActivityAt: null
      })
    ).toThrow(DomainValidationError);
  });
});
