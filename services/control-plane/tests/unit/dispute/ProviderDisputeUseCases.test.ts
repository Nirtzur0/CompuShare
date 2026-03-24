import { describe, expect, it } from "vitest";
import {
  CreateProviderDisputeUseCase,
  type CreateProviderDisputeRequest,
} from "../../../src/application/dispute/CreateProviderDisputeUseCase.js";
import { ListProviderDisputesUseCase } from "../../../src/application/dispute/ListProviderDisputesUseCase.js";
import { RecordProviderDisputeAllocationsUseCase } from "../../../src/application/dispute/RecordProviderDisputeAllocationsUseCase.js";
import { TransitionProviderDisputeStatusUseCase } from "../../../src/application/dispute/TransitionProviderDisputeStatusUseCase.js";
import type {
  AuditEvent,
  AuditLog,
} from "../../../src/application/identity/ports/AuditLog.js";
import type { ProviderDisputeRepository } from "../../../src/application/dispute/ports/ProviderDisputeRepository.js";
import { ProviderDisputeCase } from "../../../src/domain/dispute/ProviderDisputeCase.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";
import {
  ProviderDisputeAuthorizationError,
  ProviderDisputeBuyerCapabilityRequiredError,
  ProviderDisputeCaseNotFoundError,
  ProviderDisputeOrganizationNotFoundError,
  ProviderDisputePaymentReferenceNotFoundError,
  ProviderDisputeProviderCapabilityRequiredError,
  ProviderDisputeSettlementNotFoundError,
} from "../../../src/application/dispute/ProviderDisputeErrors.js";

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
  public readonly disputes = new Map<string, ProviderDisputeCase>();
  public readonly settlementRefs = new Set<string>();
  public readonly chargeRefs = new Set<string>();

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

  public hasCustomerChargeReference(input: {
    buyerOrganizationId: OrganizationId;
    paymentReference: string;
  }): Promise<boolean> {
    return Promise.resolve(
      this.chargeRefs.has(
        `${input.buyerOrganizationId.value}:${input.paymentReference}`,
      )
    );
  }

  public findBuyerOrganizationIdByPaymentReference(): Promise<OrganizationId | null> {
    return Promise.resolve(null);
  }

  public hasProviderSettlementReference(input: {
    buyerOrganizationId: OrganizationId;
    providerOrganizationId: OrganizationId;
    jobReference: string;
  }): Promise<boolean> {
    return Promise.resolve(
      this.settlementRefs.has(
        `${input.buyerOrganizationId.value}:${input.providerOrganizationId.value}:${input.jobReference}`,
      )
    );
  }

  public createProviderDisputeCase(dispute: ProviderDisputeCase): Promise<void> {
    this.disputes.set(dispute.id, dispute);
    return Promise.resolve();
  }

  public updateProviderDisputeCase(dispute: ProviderDisputeCase): Promise<void> {
    this.disputes.set(dispute.id, dispute);
    return Promise.resolve();
  }

  public findProviderDisputeCaseById(
    disputeId: string,
  ): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(this.disputes.get(disputeId) ?? null);
  }

  public findProviderDisputeCaseByStripeDisputeId(): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(null);
  }

  public findChargebackDisputeByPaymentReference(): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(null);
  }

  public listBuyerOrganizationDisputes(input: {
    buyerOrganizationId: OrganizationId;
    status?: ProviderDisputeCase["status"];
  }): Promise<readonly ProviderDisputeCase[]> {
    return Promise.resolve(
      [...this.disputes.values()].filter(
        (dispute) =>
          dispute.buyerOrganizationId.value === input.buyerOrganizationId.value &&
          (input.status === undefined || dispute.status === input.status),
      )
    );
  }

  public listProviderOrganizationDisputes(
    providerOrganizationId: OrganizationId,
  ): Promise<readonly ProviderDisputeCase[]> {
    return Promise.resolve(
      [...this.disputes.values()].filter((dispute) =>
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
      activeDisputeCount: 0,
      activeDisputeHold: UsdAmount.zero(),
      recentLostDisputeCount: 0,
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

function seedRepository(): InMemoryProviderDisputeRepository {
  const repository = new InMemoryProviderDisputeRepository();

  repository.capabilities.set("buyer-org", ["buyer"]);
  repository.capabilities.set("provider-org", ["provider"]);
  repository.members.set(
    "buyer-org:buyer-user",
    OrganizationMember.rehydrate({
      userId: "buyer-user",
      role: "finance",
      joinedAt: new Date("2026-03-10T09:00:00.000Z"),
    }),
  );
  repository.settlementRefs.add("buyer-org:provider-org:job_001");
  repository.chargeRefs.add("buyer-org:stripe_pi_001");

  return repository;
}

describe("provider dispute use cases", () => {
  it("creates settlement disputes and records an audit trail", async () => {
    const repository = seedRepository();
    const auditLog = new InMemoryAuditLog();
    const useCase = new CreateProviderDisputeUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    const response = await useCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeType: "settlement",
      providerOrganizationId: "provider-org",
      jobReference: "job_001",
      disputedAmountUsd: "4.00",
      reasonCode: "quality_miss",
      summary: "Provider failed the agreed latency and quality threshold.",
      evidenceEntries: [
        {
          label: "log_excerpt",
          value: "p95 latency exceeded the buyer-approved SLA window",
        },
      ],
    });

    expect(response.dispute).toMatchObject({
      disputeType: "settlement",
      source: "manual",
      allocations: [
        {
          providerOrganizationId: "provider-org",
          amountUsd: "4.00",
        },
      ],
    });
    expect(auditLog.events).toContainEqual(
      expect.objectContaining({
        eventName: "finance.provider_dispute.created",
      }),
    );
  });

  it("lists, allocates, and transitions chargeback disputes without mutating unrelated records", async () => {
    const repository = seedRepository();
    const auditLog = new InMemoryAuditLog();
    const createUseCase = new CreateProviderDisputeUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );
    const created = await createUseCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeType: "chargeback",
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Cardholder claims unauthorized use.",
        },
      ],
    } satisfies CreateProviderDisputeRequest);

    const allocateUseCase = new RecordProviderDisputeAllocationsUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T12:05:00.000Z"),
    );
    const allocated = await allocateUseCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeId: created.dispute.id,
      allocations: [
        {
          providerOrganizationId: "provider-org",
          amountUsd: "2.50",
        },
      ],
    });

    expect(allocated.dispute.allocations).toEqual([
      {
        providerOrganizationId: "provider-org",
        amountUsd: "2.50",
      },
    ]);

    const transitionUseCase = new TransitionProviderDisputeStatusUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T12:10:00.000Z"),
    );
    const transitioned = await transitionUseCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeId: created.dispute.id,
      nextStatus: "lost",
    });
    const listUseCase = new ListProviderDisputesUseCase(repository);
    const listed = await listUseCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      status: "lost",
    });

    expect(transitioned.dispute.status).toBe("lost");
    expect(listed.disputes.map((dispute) => dispute.id)).toEqual([
      created.dispute.id,
    ]);
    expect(auditLog.events.map((event) => event.eventName)).toEqual([
      "finance.provider_dispute.created",
      "finance.provider_dispute.allocation.recorded",
      "finance.provider_dispute.status_changed",
    ]);
  });

  it("rejects create requests when buyer finance authorization or referenced records are missing", async () => {
    const missingBuyerOrganization = seedRepository();
    missingBuyerOrganization.capabilities.delete("buyer-org");
    await expect(
      new CreateProviderDisputeUseCase(
        missingBuyerOrganization,
        new InMemoryAuditLog(),
        () => new Date("2026-03-10T12:00:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "chargeback",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        evidenceEntries: [
          {
            label: "issuer_note",
            value: "Cardholder claims unauthorized use.",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeOrganizationNotFoundError);

    const missingBuyerCapability = seedRepository();
    missingBuyerCapability.capabilities.set("buyer-org", ["provider"]);
    const useCase = new CreateProviderDisputeUseCase(
      missingBuyerCapability,
      new InMemoryAuditLog(),
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "chargeback",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        evidenceEntries: [
          {
            label: "issuer_note",
            value: "Cardholder claims unauthorized use.",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeBuyerCapabilityRequiredError);

    const unauthorizedRepository = seedRepository();
    unauthorizedRepository.members.set(
      "buyer-org:buyer-user",
      OrganizationMember.rehydrate({
        userId: "buyer-user",
        role: "developer",
        joinedAt: new Date("2026-03-10T09:00:00.000Z"),
      }),
    );
    await expect(
      new CreateProviderDisputeUseCase(
        unauthorizedRepository,
        new InMemoryAuditLog(),
        () => new Date("2026-03-10T12:00:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "chargeback",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        evidenceEntries: [
          {
            label: "issuer_note",
            value: "Cardholder claims unauthorized use.",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeAuthorizationError);

    const missingProviderCapability = seedRepository();
    missingProviderCapability.capabilities.set("provider-org", ["buyer"]);
    await expect(
      new CreateProviderDisputeUseCase(
        missingProviderCapability,
        new InMemoryAuditLog(),
        () => new Date("2026-03-10T12:00:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "settlement",
        providerOrganizationId: "provider-org",
        jobReference: "job_001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider failed the agreed latency and quality threshold.",
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeProviderCapabilityRequiredError);

    const missingProviderOrganization = seedRepository();
    missingProviderOrganization.capabilities.delete("provider-org");
    await expect(
      new CreateProviderDisputeUseCase(
        missingProviderOrganization,
        new InMemoryAuditLog(),
        () => new Date("2026-03-10T12:00:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "settlement",
        providerOrganizationId: "provider-org",
        jobReference: "job_001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider failed the agreed latency and quality threshold.",
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeOrganizationNotFoundError);

    const missingSettlement = seedRepository();
    missingSettlement.settlementRefs.clear();
    await expect(
      new CreateProviderDisputeUseCase(
        missingSettlement,
        new InMemoryAuditLog(),
        () => new Date("2026-03-10T12:00:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "settlement",
        providerOrganizationId: "provider-org",
        jobReference: "job_001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider failed the agreed latency and quality threshold.",
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeSettlementNotFoundError);

    const missingCharge = seedRepository();
    missingCharge.chargeRefs.clear();
    await expect(
      new CreateProviderDisputeUseCase(
        missingCharge,
        new InMemoryAuditLog(),
        () => new Date("2026-03-10T12:00:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeType: "chargeback",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        evidenceEntries: [
          {
            label: "issuer_note",
            value: "Cardholder claims unauthorized use.",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputePaymentReferenceNotFoundError);
  });

  it("lists buyer disputes without a status filter and rejects missing buyer organizations", async () => {
    const repository = seedRepository();
    const auditLog = new InMemoryAuditLog();
    const createUseCase = new CreateProviderDisputeUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await createUseCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeType: "settlement",
      providerOrganizationId: "provider-org",
      jobReference: "job_001",
      disputedAmountUsd: "4.00",
      reasonCode: "quality_miss",
      summary: "Provider failed the agreed latency and quality threshold.",
      evidenceEntries: [
        {
          label: "log_excerpt",
          value: "p95 latency exceeded the buyer-approved SLA window",
        },
      ],
    });
    await createUseCase.execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeType: "chargeback",
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Cardholder claims unauthorized use.",
        },
      ],
    });

    const listed = await new ListProviderDisputesUseCase(repository).execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
    });

    expect(listed.disputes).toHaveLength(2);
    expect(listed.disputes.map((dispute) => dispute.disputeType).sort()).toEqual([
      "chargeback",
      "settlement",
    ]);

    repository.capabilities.delete("buyer-org");
    await expect(
      new ListProviderDisputesUseCase(repository).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeOrganizationNotFoundError);
  });

  it("rejects allocation and transition updates for missing or cross-org disputes", async () => {
    const repository = seedRepository();
    const auditLog = new InMemoryAuditLog();
    const created = await new CreateProviderDisputeUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    ).execute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeType: "chargeback",
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Cardholder claims unauthorized use.",
        },
      ],
    });

    const foreignDispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "11111111-1111-4111-8111-111111111111",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
      paymentReference: "stripe_pi_foreign",
      disputedAmountUsd: "5.00",
      reasonCode: "fraudulent",
      summary: "Foreign dispute.",
      source: "manual",
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Foreign cardholder report.",
        },
      ],
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
    });
    repository.disputes.set(foreignDispute.id, foreignDispute);

    await expect(
      new RecordProviderDisputeAllocationsUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T12:05:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeId: "missing-dispute",
        allocations: [
          {
            providerOrganizationId: "provider-org",
            amountUsd: "2.50",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeCaseNotFoundError);

    await expect(
      new RecordProviderDisputeAllocationsUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T12:05:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeId: foreignDispute.id,
        allocations: [
          {
            providerOrganizationId: "provider-org",
            amountUsd: "2.50",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeCaseNotFoundError);

    await expect(
      new TransitionProviderDisputeStatusUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T12:10:00.000Z"),
      ).execute({
        organizationId: "buyer-org",
        actorUserId: "buyer-user",
        disputeId: foreignDispute.id,
        nextStatus: "lost",
      }),
    ).rejects.toBeInstanceOf(ProviderDisputeCaseNotFoundError);

    expect(created.dispute.status).toBe("open");
  });
});
