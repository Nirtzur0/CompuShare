import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import { ProviderDisputeCase } from "../../domain/dispute/ProviderDisputeCase.js";
import type { ProviderDisputeRepository } from "./ports/ProviderDisputeRepository.js";
import {
  assertBuyerFinanceAccess,
  assertProviderCapability,
  ProviderDisputePaymentReferenceNotFoundError,
  ProviderDisputeSettlementNotFoundError,
} from "./ProviderDisputeErrors.js";

export interface CreateProviderDisputeRequest {
  organizationId: string;
  actorUserId: string;
  disputeType: "settlement" | "chargeback";
  providerOrganizationId?: string;
  paymentReference?: string;
  jobReference?: string;
  disputedAmountUsd: string;
  reasonCode: string;
  summary: string;
  evidenceEntries: {
    label: string;
    value: string;
  }[];
}

export class CreateProviderDisputeUseCase {
  public constructor(
    private readonly repository: ProviderDisputeRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(request: CreateProviderDisputeRequest): Promise<{
    dispute: ReturnType<ProviderDisputeCase["toSnapshot"]>;
  }> {
    const createdAt = this.clock();
    const buyerOrganizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    await assertBuyerFinanceAccess(
      this.repository,
      buyerOrganizationId,
      actorUserId,
    );

    const dispute =
      request.disputeType === "settlement"
        ? await this.createSettlementDispute({
            buyerOrganizationId,
            actorUserId,
            request,
            createdAt,
          })
        : await this.createChargebackDispute({
            buyerOrganizationId,
            actorUserId,
            request,
            createdAt,
          });

    await this.repository.createProviderDisputeCase(dispute);
    const snapshot = dispute.toSnapshot();

    await this.auditLog.record({
      eventName: "finance.provider_dispute.created",
      occurredAt: createdAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: buyerOrganizationId.value,
      metadata: {
        disputeId: snapshot.id,
        disputeType: snapshot.disputeType,
        source: snapshot.source,
        status: snapshot.status,
        disputedAmountUsd: snapshot.disputedAmountUsd,
        allocationCount: snapshot.allocations.length,
      },
    });

    return {
      dispute: snapshot,
    };
  }

  private async createSettlementDispute(input: {
    buyerOrganizationId: OrganizationId;
    actorUserId: UserId;
    request: CreateProviderDisputeRequest;
    createdAt: Date;
  }): Promise<ProviderDisputeCase> {
    const providerOrganizationId = OrganizationId.create(
      input.request.providerOrganizationId ?? "",
    );
    await assertProviderCapability(this.repository, providerOrganizationId);

    const hasSettlement = await this.repository.hasProviderSettlementReference({
      buyerOrganizationId: input.buyerOrganizationId,
      providerOrganizationId,
      jobReference: input.request.jobReference ?? "",
    });

    if (!hasSettlement) {
      throw new ProviderDisputeSettlementNotFoundError(
        input.request.jobReference ?? "",
      );
    }

    return ProviderDisputeCase.createSettlement({
      buyerOrganizationId: input.buyerOrganizationId.value,
      createdByUserId: input.actorUserId.value,
      providerOrganizationId: providerOrganizationId.value,
      jobReference: input.request.jobReference ?? "",
      disputedAmountUsd: input.request.disputedAmountUsd,
      reasonCode: input.request.reasonCode,
      summary: input.request.summary,
      evidenceEntries: input.request.evidenceEntries,
      createdAt: input.createdAt,
    });
  }

  private async createChargebackDispute(input: {
    buyerOrganizationId: OrganizationId;
    actorUserId: UserId;
    request: CreateProviderDisputeRequest;
    createdAt: Date;
  }): Promise<ProviderDisputeCase> {
    const paymentReference = input.request.paymentReference ?? "";
    const hasChargeReference = await this.repository.hasCustomerChargeReference({
      buyerOrganizationId: input.buyerOrganizationId,
      paymentReference,
    });

    if (!hasChargeReference) {
      throw new ProviderDisputePaymentReferenceNotFoundError(paymentReference);
    }

    return ProviderDisputeCase.createChargeback({
      buyerOrganizationId: input.buyerOrganizationId.value,
      createdByUserId: input.actorUserId.value,
      paymentReference,
      disputedAmountUsd: input.request.disputedAmountUsd,
      reasonCode: input.request.reasonCode,
      summary: input.request.summary,
      source: "manual",
      evidenceEntries: input.request.evidenceEntries,
      createdAt: input.createdAt,
    });
  }
}
