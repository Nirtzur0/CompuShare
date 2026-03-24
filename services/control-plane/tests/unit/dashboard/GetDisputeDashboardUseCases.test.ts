import { describe, expect, it } from "vitest";
import {
  ConsumerDisputeDashboardAuthorizationError,
  ConsumerDisputeDashboardCapabilityRequiredError,
  ConsumerDisputeDashboardOrganizationNotFoundError,
  GetConsumerDisputeDashboardUseCase,
} from "../../../src/application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import {
  GetProviderDisputeDashboardUseCase,
  ProviderDisputeDashboardAuthorizationError,
  ProviderDisputeDashboardCapabilityRequiredError,
  ProviderDisputeDashboardOrganizationNotFoundError,
} from "../../../src/application/dashboard/GetProviderDisputeDashboardUseCase.js";
import type {
  AuditEvent,
  AuditLog,
} from "../../../src/application/identity/ports/AuditLog.js";
import type { ProviderDisputeRepository } from "../../../src/application/dispute/ports/ProviderDisputeRepository.js";
import { ProviderDisputeCase } from "../../../src/domain/dispute/ProviderDisputeCase.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";

class InMemoryAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryProviderDisputeRepository implements ProviderDisputeRepository {
  public readonly capabilities = new Map<string, readonly ("buyer" | "provider")[]>();
  public readonly members = new Map<string, OrganizationMember>();
  public disputes: readonly ProviderDisputeCase[] = [];

  public findOrganizationAccountCapabilities(
    organizationId: OrganizationId,
  ): Promise<readonly ("buyer" | "provider")[] | null> {
    return Promise.resolve(this.capabilities.get(organizationId.value) ?? null);
  }

  public findOrganizationMember(
    organizationId: OrganizationId,
    userId: { value: string },
  ): Promise<OrganizationMember | null> {
    return Promise.resolve(
      this.members.get(`${organizationId.value}:${userId.value}`) ?? null
    );
  }

  public hasCustomerChargeReference(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public findBuyerOrganizationIdByPaymentReference(): Promise<OrganizationId | null> {
    return Promise.resolve(null);
  }

  public hasProviderSettlementReference(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public createProviderDisputeCase(): Promise<void> {
    return Promise.resolve();
  }

  public updateProviderDisputeCase(): Promise<void> {
    return Promise.resolve();
  }

  public findProviderDisputeCaseById(): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(null);
  }

  public findProviderDisputeCaseByStripeDisputeId(): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(null);
  }

  public findChargebackDisputeByPaymentReference(): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(null);
  }

  public listBuyerOrganizationDisputes(input: {
    buyerOrganizationId: OrganizationId;
  }): Promise<readonly ProviderDisputeCase[]> {
    return Promise.resolve(
      this.disputes.filter(
        (dispute) => dispute.buyerOrganizationId.value === input.buyerOrganizationId.value,
      )
    );
  }

  public listProviderOrganizationDisputes(
    providerOrganizationId: OrganizationId,
  ): Promise<readonly ProviderDisputeCase[]> {
    return Promise.resolve(
      this.disputes.filter((dispute) =>
        dispute.allocations.some(
          (allocation) =>
            allocation.providerOrganizationId.value === providerOrganizationId.value,
        ),
      )
    );
  }

  public getProviderDisputeSummary(): Promise<{
    activeDisputeCount: number;
    activeDisputeHold: UsdAmount;
    recentLostDisputeCount: number;
  }> {
    return Promise.resolve({
      activeDisputeCount: 1,
      activeDisputeHold: UsdAmount.parse("2.50"),
      recentLostDisputeCount: 1,
    });
  }

  public getActiveProviderDisputeHold(): Promise<UsdAmount> {
    return Promise.resolve(UsdAmount.zero());
  }

  public listRecentLostDisputeCountsByProviderOrganization(): Promise<
    readonly {
      providerOrganizationId: string;
      lostDisputeCount: number;
    }[]
  > {
    return Promise.resolve([]);
  }

  public recordStripeDisputeWebhookReceipt(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

function createRepository(): InMemoryProviderDisputeRepository {
  const repository = new InMemoryProviderDisputeRepository();
  repository.capabilities.set("buyer-org", ["buyer"]);
  repository.capabilities.set("provider-org", ["provider"]);
  repository.members.set(
    "buyer-org:user-123",
    OrganizationMember.rehydrate({
      userId: "user-123",
      role: "finance",
      joinedAt: new Date("2026-03-10T09:00:00.000Z"),
    }),
  );
  repository.members.set(
    "provider-org:user-456",
    OrganizationMember.rehydrate({
      userId: "user-456",
      role: "finance",
      joinedAt: new Date("2026-03-10T09:00:00.000Z"),
    }),
  );
  repository.disputes = [
    ProviderDisputeCase.createSettlement({
      buyerOrganizationId: "buyer-org",
      createdByUserId: "user-123",
      providerOrganizationId: "provider-org",
      jobReference: "job_001",
      disputedAmountUsd: "4.00",
      reasonCode: "quality_miss",
      summary: "Provider missed the agreed latency target.",
      evidenceEntries: [
        {
          label: "log_excerpt",
          value: "p95 latency exceeded the buyer-approved SLA window",
        },
      ],
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
    }),
    ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "buyer-org",
      createdByUserId: "user-123",
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      source: "manual",
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Cardholder claims unauthorized use.",
        },
      ],
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
    })
      .replaceAllocations({
        allocations: [
          {
            providerOrganizationId: "provider-org",
            amountUsd: "2.50",
          },
        ],
        updatedAt: new Date("2026-03-10T12:05:00.000Z"),
      })
      .transitionStatus({
        nextStatus: "lost",
        occurredAt: new Date("2026-03-10T12:08:00.000Z"),
      })
      .transitionStatus({
        nextStatus: "recovered",
        occurredAt: new Date("2026-03-10T12:10:00.000Z"),
      }),
  ];

  return repository;
}

describe("dispute dashboard use cases", () => {
  it("builds the consumer dispute dashboard with active hold totals", async () => {
    const repository = createRepository();
    const useCase = new GetConsumerDisputeDashboardUseCase(
      repository,
      new InMemoryAuditLog(),
      () => new Date("2026-03-10T12:15:00.000Z"),
    );

    const response = await useCase.execute({
      organizationId: "buyer-org",
      actorUserId: "user-123",
    });

    expect(response.dashboard).toMatchObject({
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.00",
    });
    expect(response.dashboard.disputes[1]).toMatchObject({
      allocatedAmountUsd: "2.50",
      activeHoldUsd: "0.00",
    });
  });

  it("keeps historical provider allocation visible after the active hold clears", async () => {
    const repository = createRepository();
    const useCase = new GetProviderDisputeDashboardUseCase(
      repository,
      new InMemoryAuditLog(),
      () => new Date("2026-03-10T12:15:00.000Z"),
    );

    const response = await useCase.execute({
      organizationId: "provider-org",
      actorUserId: "user-456",
    });

    expect(response.dashboard).toMatchObject({
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "2.50",
      recentLostDisputeCount90d: 1,
    });
    expect(response.dashboard.disputes[1]).toMatchObject({
      allocatedAmountUsd: "2.50",
      activeHoldUsd: "0.00",
      status: "recovered",
    });
  });

  it("rejects buyer dispute dashboard access when the organization is missing, lacks buyer capability, or the actor lacks permission", async () => {
    const repository = createRepository();
    const useCase = new GetConsumerDisputeDashboardUseCase(
      repository,
      new InMemoryAuditLog(),
      () => new Date("2026-03-10T12:15:00.000Z"),
    );

    repository.capabilities.delete("buyer-org");
    await expect(
      useCase.execute({
        organizationId: "buyer-org",
        actorUserId: "user-123",
      }),
    ).rejects.toBeInstanceOf(ConsumerDisputeDashboardOrganizationNotFoundError);

    repository.capabilities.set("buyer-org", ["provider"]);
    await expect(
      useCase.execute({
        organizationId: "buyer-org",
        actorUserId: "user-123",
      }),
    ).rejects.toBeInstanceOf(ConsumerDisputeDashboardCapabilityRequiredError);

    repository.capabilities.set("buyer-org", ["buyer"]);
    repository.members.set(
      "buyer-org:user-123",
      OrganizationMember.rehydrate({
        userId: "user-123",
        role: "developer",
        joinedAt: new Date("2026-03-10T09:00:00.000Z"),
      }),
    );
    await expect(
      useCase.execute({
        organizationId: "buyer-org",
        actorUserId: "user-123",
      }),
    ).rejects.toBeInstanceOf(ConsumerDisputeDashboardAuthorizationError);
  });

  it("rejects provider dispute dashboard access when the organization is missing, lacks provider capability, or the actor lacks permission", async () => {
    const repository = createRepository();
    const useCase = new GetProviderDisputeDashboardUseCase(
      repository,
      new InMemoryAuditLog(),
      () => new Date("2026-03-10T12:15:00.000Z"),
    );

    repository.capabilities.delete("provider-org");
    await expect(
      useCase.execute({
        organizationId: "provider-org",
        actorUserId: "user-456",
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeDashboardOrganizationNotFoundError);

    repository.capabilities.set("provider-org", ["buyer"]);
    await expect(
      useCase.execute({
        organizationId: "provider-org",
        actorUserId: "user-456",
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeDashboardCapabilityRequiredError);

    repository.capabilities.set("provider-org", ["provider"]);
    repository.members.set(
      "provider-org:user-456",
      OrganizationMember.rehydrate({
        userId: "user-456",
        role: "developer",
        joinedAt: new Date("2026-03-10T09:00:00.000Z"),
      }),
    );
    await expect(
      useCase.execute({
        organizationId: "provider-org",
        actorUserId: "user-456",
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeDashboardAuthorizationError);
  });
});
