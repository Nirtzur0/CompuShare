import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { ProviderDisputeCase } from "../../domain/dispute/ProviderDisputeCase.js";
import type { ProviderDisputeRepository } from "./ports/ProviderDisputeRepository.js";
import {
  assertBuyerFinanceAccess,
  assertProviderCapability,
  ProviderDisputeCaseNotFoundError,
} from "./ProviderDisputeErrors.js";

export interface RecordProviderDisputeAllocationsRequest {
  organizationId: string;
  actorUserId: string;
  disputeId: string;
  allocations: {
    providerOrganizationId: string;
    amountUsd: string;
  }[];
}

export class RecordProviderDisputeAllocationsUseCase {
  public constructor(
    private readonly repository: ProviderDisputeRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    request: RecordProviderDisputeAllocationsRequest,
  ): Promise<{
    dispute: ReturnType<ProviderDisputeCase["toSnapshot"]>;
  }> {
    const occurredAt = this.clock();
    const buyerOrganizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    await assertBuyerFinanceAccess(
      this.repository,
      buyerOrganizationId,
      actorUserId,
    );

    const dispute = await this.repository.findProviderDisputeCaseById(
      request.disputeId,
    );

    if (dispute?.buyerOrganizationId.value !== buyerOrganizationId.value) {
      throw new ProviderDisputeCaseNotFoundError(request.disputeId);
    }

    for (const allocation of request.allocations) {
      await assertProviderCapability(
        this.repository,
        OrganizationId.create(allocation.providerOrganizationId),
      );
    }

    const updatedDispute = dispute.replaceAllocations({
      allocations: request.allocations,
      updatedAt: occurredAt,
    });
    await this.repository.updateProviderDisputeCase(updatedDispute);
    const snapshot = updatedDispute.toSnapshot();

    await this.auditLog.record({
      eventName: "finance.provider_dispute.allocation.recorded",
      occurredAt: occurredAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: buyerOrganizationId.value,
      metadata: {
        disputeId: snapshot.id,
        allocationCount: snapshot.allocations.length,
        allocatedAmountUsd: snapshot.allocations
          .map((allocation) => allocation.amountUsd)
          .join(","),
      },
    });

    return {
      dispute: snapshot,
    };
  }
}
