import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import type {
  ProviderDisputeCase,
  ProviderDisputeStatus,
} from "../../domain/dispute/ProviderDisputeCase.js";
import type { ProviderDisputeRepository } from "./ports/ProviderDisputeRepository.js";
import {
  assertBuyerFinanceAccess,
  ProviderDisputeCaseNotFoundError,
} from "./ProviderDisputeErrors.js";

export interface TransitionProviderDisputeStatusRequest {
  organizationId: string;
  actorUserId: string;
  disputeId: string;
  nextStatus: ProviderDisputeStatus;
}

export class TransitionProviderDisputeStatusUseCase {
  public constructor(
    private readonly repository: ProviderDisputeRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    request: TransitionProviderDisputeStatusRequest,
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

    const updatedDispute = dispute.transitionStatus({
      nextStatus: request.nextStatus,
      occurredAt,
    });
    await this.repository.updateProviderDisputeCase(updatedDispute);
    const snapshot = updatedDispute.toSnapshot();

    await this.auditLog.record({
      eventName: "finance.provider_dispute.status_changed",
      occurredAt: occurredAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: buyerOrganizationId.value,
      metadata: {
        disputeId: snapshot.id,
        nextStatus: snapshot.status,
      },
    });

    return {
      dispute: snapshot,
    };
  }
}
