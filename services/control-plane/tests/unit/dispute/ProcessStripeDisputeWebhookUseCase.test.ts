import { describe, expect, it } from "vitest";
import { ProcessStripeDisputeWebhookUseCase } from "../../../src/application/dispute/ProcessStripeDisputeWebhookUseCase.js";
import type { ProviderDisputeRepository } from "../../../src/application/dispute/ports/ProviderDisputeRepository.js";
import type {
  StripeDisputeClient,
  StripeDisputeWebhookEnvelope,
} from "../../../src/application/dispute/ports/StripeDisputeClient.js";
import type {
  AuditEvent,
  AuditLog,
} from "../../../src/application/identity/ports/AuditLog.js";
import { ProviderDisputeCase } from "../../../src/domain/dispute/ProviderDisputeCase.js";
import { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";

class InMemoryAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryStripeDisputeClient implements StripeDisputeClient {
  public constructor(private readonly envelope: StripeDisputeWebhookEnvelope) {}

  public verifyWebhook(): Promise<StripeDisputeWebhookEnvelope> {
    return Promise.resolve(this.envelope);
  }
}

class InMemoryProviderDisputeRepository implements ProviderDisputeRepository {
  public readonly disputes = new Map<string, ProviderDisputeCase>();
  public readonly receipts = new Set<string>();
  public readonly paymentReferences = new Map<string, string>();

  public findOrganizationAccountCapabilities() {
    return Promise.resolve(null);
  }

  public findOrganizationMember() {
    return Promise.resolve(null);
  }

  public hasCustomerChargeReference() {
    return Promise.resolve(false);
  }

  public findBuyerOrganizationIdByPaymentReference(
    paymentReference: string,
  ): Promise<OrganizationId | null> {
    const organizationId = this.paymentReferences.get(paymentReference);
    return Promise.resolve(
      organizationId === undefined ? null : OrganizationId.create(organizationId)
    );
  }

  public hasProviderSettlementReference() {
    return Promise.resolve(false);
  }

  public createProviderDisputeCase(dispute: ProviderDisputeCase): Promise<void> {
    this.disputes.set(dispute.id, dispute);
    return Promise.resolve();
  }

  public updateProviderDisputeCase(dispute: ProviderDisputeCase): Promise<void> {
    this.disputes.set(dispute.id, dispute);
    return Promise.resolve();
  }

  public findProviderDisputeCaseById(): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(null);
  }

  public findProviderDisputeCaseByStripeDisputeId(
    stripeDisputeId: string,
  ): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(
      [...this.disputes.values()].find(
        (dispute) => dispute.stripeDisputeId === stripeDisputeId,
      ) ?? null
    );
  }

  public findChargebackDisputeByPaymentReference(input: {
    buyerOrganizationId: OrganizationId;
    paymentReference: string;
  }): Promise<ProviderDisputeCase | null> {
    return Promise.resolve(
      [...this.disputes.values()].find(
        (dispute) =>
          dispute.buyerOrganizationId.value === input.buyerOrganizationId.value &&
          dispute.paymentReference === input.paymentReference,
      ) ?? null
    );
  }

  public listBuyerOrganizationDisputes(): Promise<readonly ProviderDisputeCase[]> {
    return Promise.resolve([]);
  }

  public listProviderOrganizationDisputes(): Promise<readonly ProviderDisputeCase[]> {
    return Promise.resolve([]);
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

  public recordStripeDisputeWebhookReceipt(input: {
    eventId: string;
  }): Promise<boolean> {
    if (this.receipts.has(input.eventId)) {
      return Promise.resolve(false);
    }

    this.receipts.add(input.eventId);
    return Promise.resolve(true);
  }
}

describe("ProcessStripeDisputeWebhookUseCase", () => {
  it("creates a buyer-linked chargeback dispute when the payment reference resolves", async () => {
    const repository = new InMemoryProviderDisputeRepository();
    const auditLog = new InMemoryAuditLog();
    repository.paymentReferences.set("stripe_pi_001", "buyer-org");
    const useCase = new ProcessStripeDisputeWebhookUseCase(
      repository,
      new InMemoryStripeDisputeClient({
        id: "evt_001",
        type: "charge.dispute.created",
        stripeDisputeId: "dp_001",
        stripeChargeId: "ch_001",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Stripe dispute opened.",
        stripeReason: "fraudulent",
        stripeStatus: "needs_response",
        nextStatus: "open",
      }),
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    const response = await useCase.execute({
      payload: JSON.stringify({ id: "evt_001" }),
      signature: "sig_123",
    });

    expect(response).toEqual({ accepted: true });
    expect([...repository.disputes.values()][0]?.toSnapshot()).toMatchObject({
      buyerOrganizationId: "buyer-org",
      source: "stripe_webhook",
      paymentReference: "stripe_pi_001",
      stripeDisputeId: "dp_001",
    });
    expect(auditLog.events).toContainEqual(
      expect.objectContaining({
        eventName: "finance.stripe_dispute_webhook.received",
      }),
    );
  });

  it("records orphaned webhook receipts when the payment reference is missing", async () => {
    const repository = new InMemoryProviderDisputeRepository();
    const auditLog = new InMemoryAuditLog();
    const useCase = new ProcessStripeDisputeWebhookUseCase(
      repository,
      new InMemoryStripeDisputeClient({
        id: "evt_002",
        type: "charge.dispute.created",
        stripeDisputeId: "dp_002",
        stripeChargeId: "ch_002",
        paymentReference: null,
        disputedAmountUsd: "5.00",
        reasonCode: "fraudulent",
        summary: "Stripe dispute opened without metadata.",
        stripeReason: "fraudulent",
        stripeStatus: "needs_response",
        nextStatus: "open",
      }),
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({
        payload: JSON.stringify({ id: "evt_002" }),
        signature: "sig_123",
      }),
    ).resolves.toEqual({ accepted: true });

    expect(repository.disputes.size).toBe(0);
    expect(auditLog.events).toContainEqual(
      expect.objectContaining({
        eventName: "finance.stripe_dispute_webhook.orphaned",
      }),
    );
  });

  it("returns early for duplicate receipts and unsupported Stripe events", async () => {
    const duplicateRepository = new InMemoryProviderDisputeRepository();
    duplicateRepository.receipts.add("evt_duplicate");
    const duplicateAuditLog = new InMemoryAuditLog();
    const duplicateUseCase = new ProcessStripeDisputeWebhookUseCase(
      duplicateRepository,
      new InMemoryStripeDisputeClient({
        id: "evt_duplicate",
        type: "charge.dispute.updated",
        stripeDisputeId: "dp_duplicate",
        stripeChargeId: "ch_duplicate",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Duplicate event.",
        stripeReason: "fraudulent",
        stripeStatus: "needs_response",
        nextStatus: "under_review",
      }),
      duplicateAuditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await expect(
      duplicateUseCase.execute({
        payload: JSON.stringify({ id: "evt_duplicate" }),
        signature: "sig_123",
      }),
    ).resolves.toEqual({ accepted: true });
    expect(duplicateRepository.disputes.size).toBe(0);
    expect(duplicateAuditLog.events).toHaveLength(0);

    const unsupportedRepository = new InMemoryProviderDisputeRepository();
    const unsupportedAuditLog = new InMemoryAuditLog();
    const unsupportedUseCase = new ProcessStripeDisputeWebhookUseCase(
      unsupportedRepository,
      new InMemoryStripeDisputeClient({
        id: "evt_unsupported",
        type: "unsupported",
      }),
      unsupportedAuditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await expect(
      unsupportedUseCase.execute({
        payload: JSON.stringify({ id: "evt_unsupported" }),
        signature: "sig_123",
      }),
    ).resolves.toEqual({ accepted: true });
    expect(unsupportedRepository.disputes.size).toBe(0);
    expect(unsupportedAuditLog.events).toHaveLength(0);
  });

  it("records orphaned webhook receipts when the buyer charge cannot be resolved", async () => {
    const repository = new InMemoryProviderDisputeRepository();
    const auditLog = new InMemoryAuditLog();
    const useCase = new ProcessStripeDisputeWebhookUseCase(
      repository,
      new InMemoryStripeDisputeClient({
        id: "evt_003",
        type: "charge.dispute.created",
        stripeDisputeId: "dp_003",
        stripeChargeId: "ch_003",
        paymentReference: "stripe_pi_missing",
        disputedAmountUsd: "5.00",
        reasonCode: "fraudulent",
        summary: "Stripe dispute opened without a known charge.",
        stripeReason: "fraudulent",
        stripeStatus: "needs_response",
        nextStatus: "open",
      }),
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({
        payload: JSON.stringify({ id: "evt_003" }),
        signature: "sig_123",
      }),
    ).resolves.toEqual({ accepted: true });

    expect(repository.disputes.size).toBe(0);
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]?.eventName).toBe(
      "finance.stripe_dispute_webhook.orphaned",
    );
    expect(auditLog.events[0]?.metadata).toMatchObject({
      reason: "buyer_charge_not_found",
      paymentReference: "stripe_pi_missing",
    });
  });

  it("updates an existing Stripe-backed dispute instead of creating a duplicate", async () => {
    const repository = new InMemoryProviderDisputeRepository();
    const auditLog = new InMemoryAuditLog();
    const existingDispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "buyer-org",
      createdByUserId: null,
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Stripe dispute opened.",
      source: "stripe_webhook",
      evidenceEntries: [],
      createdAt: new Date("2026-03-10T11:55:00.000Z"),
      stripeDisputeId: "dp_004",
      stripeChargeId: "ch_004",
      stripeReason: "fraudulent",
      stripeStatus: "warning_needs_response",
    }).replaceAllocations({
      allocations: [
        {
          providerOrganizationId: "provider-org",
          amountUsd: "2.50",
        },
      ],
      updatedAt: new Date("2026-03-10T11:56:00.000Z"),
    });
    repository.disputes.set(existingDispute.id, existingDispute);
    repository.paymentReferences.set("stripe_pi_001", "buyer-org");

    const useCase = new ProcessStripeDisputeWebhookUseCase(
      repository,
      new InMemoryStripeDisputeClient({
        id: "evt_004",
        type: "charge.dispute.closed",
        stripeDisputeId: "dp_004",
        stripeChargeId: "ch_004",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Stripe dispute closed in the buyer's favor.",
        stripeReason: "fraudulent",
        stripeStatus: "won",
        nextStatus: "won",
      }),
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({
        payload: JSON.stringify({ id: "evt_004" }),
        signature: "sig_123",
      }),
    ).resolves.toEqual({ accepted: true });

    const updatedDispute = [...repository.disputes.values()][0];

    expect(repository.disputes.size).toBe(1);
    expect(updatedDispute?.toSnapshot()).toMatchObject({
      id: existingDispute.id,
      status: "won",
      stripeStatus: "won",
      allocations: [
        {
          providerOrganizationId: "provider-org",
          amountUsd: "2.50",
        },
      ],
    });
  });
});
