import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../../src/domain/identity/DomainValidationError.js";
import { ProviderDisputeCase } from "../../../../src/domain/dispute/ProviderDisputeCase.js";

describe("ProviderDisputeCase", () => {
  it("creates settlement disputes with one provider allocation equal to the disputed amount", () => {
    const dispute = ProviderDisputeCase.createSettlement({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
      providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
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
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(dispute.toSnapshot()).toMatchObject({
      disputeType: "settlement",
      source: "manual",
      status: "open",
      jobReference: "job_001",
      paymentReference: null,
      disputedAmountUsd: "4.00",
      allocations: [
        {
          providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
          amountUsd: "4.00",
        },
      ],
    });
    expect(
      dispute.activeAllocatedAmountForProvider(
        "9ebfb110-d6f3-4442-b718-f3e988c73a34",
      ).toUsdString(),
    ).toBe("4.00");
  });

  it("rejects allocations that exceed the dispute amount", () => {
    const dispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
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
    });

    expect(() =>
      dispute.replaceAllocations({
        allocations: [
          {
            providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
            amountUsd: "4.00",
          },
          {
            providerOrganizationId: "fb53aa7b-fce2-4fb9-a795-85a6e18b352f",
            amountUsd: "2.50",
          },
        ],
        updatedAt: new Date("2026-03-10T12:10:00.000Z"),
      }),
    ).toThrowError(DomainValidationError);
  });

  it("keeps allocated amount but clears active hold once a dispute is recovered", () => {
    const recovered = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
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
            providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
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
        occurredAt: new Date("2026-03-10T12:12:00.000Z"),
      });

    const snapshot = recovered.toSnapshot();

    expect(snapshot.status).toBe("recovered");
    expect(snapshot.allocations).toEqual([
      {
        providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
        amountUsd: "2.50",
      },
    ]);
    expect(
      recovered.activeAllocatedAmountForProvider(
        "9ebfb110-d6f3-4442-b718-f3e988c73a34",
      ).toUsdString(),
    ).toBe("0.00");
  });

  it("syncs webhook-backed chargebacks without losing existing allocations", () => {
    const synced = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: null,
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      source: "stripe_webhook",
      evidenceEntries: [],
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      stripeDisputeId: "dp_001",
      stripeChargeId: "ch_001",
      stripeReason: "fraudulent",
      stripeStatus: "warning_needs_response",
    }).replaceAllocations({
      allocations: [
        {
          providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
          amountUsd: "3.00",
        },
      ],
      updatedAt: new Date("2026-03-10T12:05:00.000Z"),
    });

    const updated = synced.syncStripeChargeback({
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Stripe marked the dispute as won.",
      stripeDisputeId: "dp_001",
      stripeChargeId: "ch_001",
      stripeReason: "fraudulent",
      stripeStatus: "won",
      nextStatus: "won",
      occurredAt: new Date("2026-03-10T12:20:00.000Z"),
    });

    expect(updated.toSnapshot()).toMatchObject({
      source: "stripe_webhook",
      status: "won",
      stripeStatus: "won",
      allocations: [
        {
          providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
          amountUsd: "3.00",
        },
      ],
    });
  });

  it("rejects settlement reallocations and invalid status transitions", () => {
    const settlement = ProviderDisputeCase.createSettlement({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
      providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
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
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(() =>
      settlement.replaceAllocations({
        allocations: [
          {
            providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
            amountUsd: "4.00",
          },
        ],
        updatedAt: new Date("2026-03-10T12:05:00.000Z"),
      }),
    ).toThrowError(
      "Only chargeback disputes may be allocated after creation.",
    );

    expect(() =>
      settlement.transitionStatus({
        nextStatus: "recovered",
        occurredAt: new Date("2026-03-10T12:06:00.000Z"),
      }),
    ).toThrowError(
      "Provider dispute status may not transition from open to recovered.",
    );
  });

  it("rejects manual chargebacks without evidence and duplicate provider allocations", () => {
    expect(() =>
      ProviderDisputeCase.createChargeback({
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        source: "manual",
        evidenceEntries: [],
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
      }),
    ).toThrowError("Provider disputes require at least one evidence entry.");

    const dispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
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
    });

    expect(() =>
      dispute.replaceAllocations({
        allocations: [
          {
            providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
            amountUsd: "2.00",
          },
          {
            providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
            amountUsd: "1.00",
          },
        ],
        updatedAt: new Date("2026-03-10T12:05:00.000Z"),
      }),
    ).toThrowError(
      "Provider dispute allocations may include each provider only once.",
    );
  });

  it("rehydrates disputes with invariant validation and clears exposure for inactive statuses", () => {
    const dispute = ProviderDisputeCase.rehydrate({
      id: "4f4f0e8b-b7e0-4ad0-a421-d3e7fe9836f9",
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
      disputeType: "chargeback",
      source: "manual",
      status: "canceled",
      paymentReference: "stripe_pi_001",
      jobReference: null,
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      stripeDisputeId: null,
      stripeChargeId: null,
      stripeReason: null,
      stripeStatus: null,
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      updatedAt: new Date("2026-03-10T12:03:00.000Z"),
      resolvedAt: new Date("2026-03-10T12:03:00.000Z"),
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Cardholder claims unauthorized use.",
        },
      ],
      allocations: [
        {
          providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
          amountUsd: "2.50",
        },
      ],
    });

    expect(dispute.activeAllocatedAmount.toUsdString()).toBe("0.00");
    expect(
      dispute.activeAllocatedAmountForProvider(
        "9ebfb110-d6f3-4442-b718-f3e988c73a34",
      ).toUsdString(),
    ).toBe("0.00");

    expect(() =>
      ProviderDisputeCase.rehydrate({
        id: "4f4f0e8b-b7e0-4ad0-a421-d3e7fe9836f9",
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        disputeType: "settlement",
        source: "manual",
        status: "open",
        paymentReference: "stripe_pi_001",
        jobReference: "job_001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider failed the agreed latency and quality threshold.",
        stripeDisputeId: null,
        stripeChargeId: null,
        stripeReason: null,
        stripeStatus: null,
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        updatedAt: new Date("2026-03-10T12:03:00.000Z"),
        resolvedAt: null,
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
        allocations: [
          {
            providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
            amountUsd: "4.00",
          },
        ],
      }),
    ).toThrowError("Settlement disputes cannot include a payment reference.");
  });

  it("rejects invalid rehydrated metadata and invalid webhook external ids", () => {
    expect(() =>
      ProviderDisputeCase.rehydrate({
        id: "4f4f0e8b-b7e0-4ad0-a421-d3e7fe9836f9",
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        disputeType: "refund",
        source: "manual",
        status: "open",
        paymentReference: "stripe_pi_001",
        jobReference: null,
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        stripeDisputeId: null,
        stripeChargeId: null,
        stripeReason: null,
        stripeStatus: null,
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        updatedAt: new Date("2026-03-10T12:03:00.000Z"),
        resolvedAt: null,
        evidenceEntries: [],
        allocations: [],
      }),
    ).toThrowError("Unsupported provider dispute type: refund.");

    expect(() =>
      ProviderDisputeCase.rehydrate({
        id: "4f4f0e8b-b7e0-4ad0-a421-d3e7fe9836f9",
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        disputeType: "chargeback",
        source: "imported",
        status: "open",
        paymentReference: "stripe_pi_001",
        jobReference: null,
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        stripeDisputeId: null,
        stripeChargeId: null,
        stripeReason: null,
        stripeStatus: null,
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        updatedAt: new Date("2026-03-10T12:03:00.000Z"),
        resolvedAt: null,
        evidenceEntries: [],
        allocations: [],
      }),
    ).toThrowError("Unsupported provider dispute source: imported.");

    expect(() =>
      ProviderDisputeCase.rehydrate({
        id: "4f4f0e8b-b7e0-4ad0-a421-d3e7fe9836f9",
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        disputeType: "chargeback",
        source: "manual",
        status: "closed",
        paymentReference: "stripe_pi_001",
        jobReference: null,
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        stripeDisputeId: null,
        stripeChargeId: null,
        stripeReason: null,
        stripeStatus: null,
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        updatedAt: new Date("2026-03-10T12:03:00.000Z"),
        resolvedAt: null,
        evidenceEntries: [],
        allocations: [],
      }),
    ).toThrowError("Unsupported provider dispute status: closed.");

    const webhookDispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: null,
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      source: "stripe_webhook",
      evidenceEntries: [],
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      stripeDisputeId: "dp_001",
      stripeChargeId: "ch_001",
      stripeReason: "fraudulent",
      stripeStatus: "needs_response",
    });

    expect(() =>
      webhookDispute.syncStripeChargeback({
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Stripe marked the dispute as won.",
        stripeDisputeId: "  ",
        stripeChargeId: "ch_001",
        stripeReason: "fraudulent",
        stripeStatus: "won",
        nextStatus: "won",
        occurredAt: new Date("2026-03-10T12:20:00.000Z"),
      }),
    ).toThrowError(
      "Provider dispute external IDs must be between 3 and 120 characters.",
    );
  });

  it("refreshes resolved timestamps when webhook sync keeps an already resolved status", () => {
    const wonDispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: null,
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      source: "stripe_webhook",
      evidenceEntries: [],
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      stripeDisputeId: "dp_001",
      stripeChargeId: "ch_001",
      stripeReason: "fraudulent",
      stripeStatus: "won",
    }).transitionStatus({
      nextStatus: "won",
      occurredAt: new Date("2026-03-10T12:05:00.000Z"),
    });

    const resynced = wonDispute.syncStripeChargeback({
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Stripe confirmed the dispute is still won.",
      stripeDisputeId: "dp_001",
      stripeChargeId: "ch_001",
      stripeReason: "fraudulent",
      stripeStatus: "won",
      nextStatus: "won",
      occurredAt: new Date("2026-03-10T12:20:00.000Z"),
    });

    expect(resynced.status).toBe("won");
    expect(resynced.toSnapshot().resolvedAt).toBe("2026-03-10T12:20:00.000Z");
  });

  it("allows no-op status transitions and rejects malformed rehydrated ids", () => {
    const dispute = ProviderDisputeCase.createChargeback({
      buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
      createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
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
    });

    const noOp = dispute.transitionStatus({
      nextStatus: "open",
      occurredAt: new Date("2026-03-10T12:10:00.000Z"),
    });

    expect(noOp.status).toBe("open");
    expect(noOp.toSnapshot().updatedAt).toBe("2026-03-10T12:10:00.000Z");

    expect(() =>
      ProviderDisputeCase.rehydrate({
        id: "too-short",
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        disputeType: "chargeback",
        source: "manual",
        status: "open",
        paymentReference: "stripe_pi_001",
        jobReference: null,
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        stripeDisputeId: null,
        stripeChargeId: null,
        stripeReason: null,
        stripeStatus: null,
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        updatedAt: new Date("2026-03-10T12:03:00.000Z"),
        resolvedAt: null,
        evidenceEntries: [],
        allocations: [],
      }),
    ).toThrowError("Provider dispute IDs must be UUID values.");
  });

  it("rejects invalid dispute summaries and references", () => {
    expect(() =>
      ProviderDisputeCase.createChargeback({
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        paymentReference: "pi",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "bad",
        source: "manual",
        evidenceEntries: [
          {
            label: "issuer_note",
            value: "Cardholder claims unauthorized use.",
          },
        ],
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
      }),
    ).toThrowError("Payment references must be between 3 and 120 characters.");

    expect(() =>
      ProviderDisputeCase.createSettlement({
        buyerOrganizationId: "5f8624c4-8f4e-42af-bf0a-463158f8baa7",
        createdByUserId: "45d9e2d0-b4b1-46d5-bd0c-ae2679058c9c",
        providerOrganizationId: "9ebfb110-d6f3-4442-b718-f3e988c73a34",
        jobReference: "job_001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: " bad ",
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
      }),
    ).toThrowError(
      "Provider dispute summaries must be between 5 and 500 characters.",
    );
  });
});
