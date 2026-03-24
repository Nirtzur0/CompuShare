import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import type {
  ProviderDisputeCase,
  ProviderDisputeStatus,
} from "../../domain/dispute/ProviderDisputeCase.js";
import type { ProviderDisputeRepository } from "./ports/ProviderDisputeRepository.js";
import { assertBuyerFinanceAccess } from "./ProviderDisputeErrors.js";

export interface ListProviderDisputesRequest {
  organizationId: string;
  actorUserId: string;
  status?: ProviderDisputeStatus;
}

export class ListProviderDisputesUseCase {
  public constructor(private readonly repository: ProviderDisputeRepository) {}

  public async execute(request: ListProviderDisputesRequest): Promise<{
    disputes: ReturnType<ProviderDisputeCase["toSnapshot"]>[];
  }> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    await assertBuyerFinanceAccess(
      this.repository,
      organizationId,
      actorUserId,
    );

    const disputes = await this.repository.listBuyerOrganizationDisputes(
      request.status === undefined
        ? {
            buyerOrganizationId: organizationId,
          }
        : {
            buyerOrganizationId: organizationId,
            status: request.status,
          }
    );

    return {
      disputes: disputes.map((dispute) => dispute.toSnapshot()),
    };
  }
}
