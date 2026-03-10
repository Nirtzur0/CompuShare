import { describe, expect, it } from "vitest";
import { FraudDetectionPolicy } from "../../../src/config/FraudDetectionPolicy.js";
import { FraudGraphCounterpartyExposure } from "../../../src/domain/fraud/FraudGraphCounterpartyExposure.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { GetFraudReviewAlertsUseCase, FraudReviewAuthorizationError, FraudReviewOrganizationNotFoundError } from "../../../src/application/fraud/GetFraudReviewAlertsUseCase.js";
import type { FraudReviewRepository } from "../../../src/application/fraud/ports/FraudReviewRepository.js";
import type { AuditEvent, AuditLog } from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import type { UserId } from "../../../src/domain/identity/UserId.js";

class InMemoryFraudReviewRepository implements FraudReviewRepository {
  public capabilities = new Map<string, readonly ("buyer" | "provider")[]>();
  public members = new Map<string, OrganizationMember>();
  public exposures: FraudGraphCounterpartyExposure[] = [];

  public async findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ) {
    return await Promise.resolve(
      this.capabilities.get(organizationId.value) ?? null
    );
  }

  public async findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ) {
    return await Promise.resolve(
      this.members.get(`${organizationId.value}:${userId.value}`) ?? null
    );
  }

  public async listFraudGraphCounterpartyExposures() {
    return await Promise.resolve(this.exposures);
  }
}

class InMemoryAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public async record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    await Promise.resolve();
  }
}

describe("GetFraudReviewAlertsUseCase", () => {
  it("returns deterministic explainable alerts for suspicious counterparty edges", async () => {
    const repository = new InMemoryFraudReviewRepository();
    const auditLog = new InMemoryAuditLog();
    const organizationId = "87057cb0-e0ca-4095-9f25-dd8103408b18";
    const actorUserId = "97d876d5-6fbe-4176-b88a-c6ddd400af45";
    repository.capabilities.set(organizationId, ["buyer", "provider"]);
    repository.members.set(
      `${organizationId}:${actorUserId}`,
      OrganizationMember.rehydrate({
        userId: actorUserId,
        role: "finance",
        joinedAt: new Date("2026-03-10T12:00:00.000Z")
      })
    );
    repository.exposures = [
      FraudGraphCounterpartyExposure.create({
        organizationId,
        counterpartyOrganizationId: organizationId,
        counterpartyOrganizationName: "CompuShare Org",
        counterpartyOrganizationSlug: "compushare-org",
        sharedMemberEmails: [],
        outgoingSettlementCount: 1,
        outgoingSettledUsd: "30.00",
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 0,
        incomingSettledUsd: "0.00",
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: "2026-03-08T10:00:00.000Z",
        lastActivityAt: "2026-03-08T10:00:00.000Z"
      }),
      FraudGraphCounterpartyExposure.create({
        organizationId,
        counterpartyOrganizationId: "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
        counterpartyOrganizationName: "Shared Provider",
        counterpartyOrganizationSlug: "shared-provider",
        sharedMemberEmails: ["shared@example.com"],
        outgoingSettlementCount: 3,
        outgoingSettledUsd: "90.00",
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 0,
        incomingSettledUsd: "0.00",
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: "2026-03-07T10:00:00.000Z",
        lastActivityAt: "2026-03-09T10:00:00.000Z"
      }),
      FraudGraphCounterpartyExposure.create({
        organizationId,
        counterpartyOrganizationId: "5db85f04-e37a-4c5f-8878-9824861d1d84",
        counterpartyOrganizationName: "Backup Provider",
        counterpartyOrganizationSlug: "backup-provider",
        sharedMemberEmails: [],
        outgoingSettlementCount: 1,
        outgoingSettledUsd: "10.00",
        outgoingUsageEventCount: 1,
        outgoingUsageTotalTokens: 1200,
        incomingSettlementCount: 0,
        incomingSettledUsd: "0.00",
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: "2026-03-07T11:00:00.000Z",
        lastActivityAt: "2026-03-09T11:00:00.000Z"
      })
    ];

    const useCase = new GetFraudReviewAlertsUseCase(
      repository,
      auditLog,
      FraudDetectionPolicy.createDefault(),
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId,
      actorUserId,
      lookbackDays: 30
    });

    expect(response.graph).toMatchObject({
      lookbackDays: 30,
      counterpartyCount: 3,
      outgoingSettledUsd: "130.00",
      incomingSettledUsd: "0.00",
      alertCount: 4,
      highSeverityAlertCount: 2
    });
    expect(response.alerts.map((alert) => alert.signalType)).toEqual([
      "self_settlement",
      "shared_member_settlement",
      "settlement_without_usage",
      "settlement_without_usage"
    ]);
    expect(auditLog.events[0]).toMatchObject({
      eventName: "risk.fraud_review.scanned",
      organizationId,
      metadata: {
        alertCount: 4,
        highSeverityAlertCount: 2
      }
    });
  });

  it("rejects unauthorized members", async () => {
    const repository = new InMemoryFraudReviewRepository();
    const organizationId = "87057cb0-e0ca-4095-9f25-dd8103408b18";
    const actorUserId = "97d876d5-6fbe-4176-b88a-c6ddd400af45";
    repository.capabilities.set(organizationId, ["buyer"]);
    repository.members.set(
      `${organizationId}:${actorUserId}`,
      OrganizationMember.rehydrate({
        userId: actorUserId,
        role: "developer",
        joinedAt: new Date("2026-03-10T12:00:00.000Z")
      })
    );

    const useCase = new GetFraudReviewAlertsUseCase(
      repository,
      new InMemoryAuditLog(),
      FraudDetectionPolicy.createDefault()
    );

    await expect(
      useCase.execute({
        organizationId,
        actorUserId
      })
    ).rejects.toBeInstanceOf(FraudReviewAuthorizationError);
  });

  it("fails when the organization does not exist", async () => {
    const useCase = new GetFraudReviewAlertsUseCase(
      new InMemoryFraudReviewRepository(),
      new InMemoryAuditLog(),
      FraudDetectionPolicy.createDefault()
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      })
    ).rejects.toBeInstanceOf(FraudReviewOrganizationNotFoundError);
  });

  it("raises concentration alerts when one counterparty dominates settled activity", async () => {
    const repository = new InMemoryFraudReviewRepository();
    const auditLog = new InMemoryAuditLog();
    const organizationId = "87057cb0-e0ca-4095-9f25-dd8103408b18";
    const actorUserId = "97d876d5-6fbe-4176-b88a-c6ddd400af45";
    repository.capabilities.set(organizationId, ["buyer", "provider"]);
    repository.members.set(
      `${organizationId}:${actorUserId}`,
      OrganizationMember.rehydrate({
        userId: actorUserId,
        role: "owner",
        joinedAt: new Date("2026-03-10T12:00:00.000Z")
      })
    );
    repository.exposures = [
      FraudGraphCounterpartyExposure.create({
        organizationId,
        counterpartyOrganizationId: "11111111-1111-4111-8111-111111111111",
        counterpartyOrganizationName: "Primary Customer",
        counterpartyOrganizationSlug: "primary-customer",
        sharedMemberEmails: [],
        outgoingSettlementCount: 0,
        outgoingSettledUsd: "0.00",
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 3,
        incomingSettledUsd: "90.00",
        incomingUsageEventCount: 3,
        incomingUsageTotalTokens: 5400,
        firstActivityAt: "2026-03-07T10:00:00.000Z",
        lastActivityAt: "2026-03-09T10:00:00.000Z"
      }),
      FraudGraphCounterpartyExposure.create({
        organizationId,
        counterpartyOrganizationId: "22222222-2222-4222-8222-222222222222",
        counterpartyOrganizationName: "Secondary Customer",
        counterpartyOrganizationSlug: "secondary-customer",
        sharedMemberEmails: [],
        outgoingSettlementCount: 0,
        outgoingSettledUsd: "0.00",
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 1,
        incomingSettledUsd: "10.00",
        incomingUsageEventCount: 1,
        incomingUsageTotalTokens: 600,
        firstActivityAt: "2026-03-08T10:00:00.000Z",
        lastActivityAt: "2026-03-09T10:30:00.000Z"
      })
    ];

    const useCase = new GetFraudReviewAlertsUseCase(
      repository,
      auditLog,
      FraudDetectionPolicy.createDefault(),
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId,
      actorUserId
    });

    expect(response.alerts).toHaveLength(1);
    expect(response.alerts[0]).toMatchObject({
      signalType: "counterparty_concentration",
      severity: "medium",
      counterpartyOrganizationId: "11111111-1111-4111-8111-111111111111"
    });
    expect(auditLog.events[0]).toMatchObject({
      metadata: {
        alertCount: 1,
        signalTypes: ["counterparty_concentration"]
      }
    });
  });
});
