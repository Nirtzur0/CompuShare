import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canManageOrganizationFinances } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import {
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError
} from "./LedgerErrors.js";
import type { OrganizationLedgerRepository } from "./ports/OrganizationLedgerRepository.js";

export interface GetOrganizationWalletSummaryRequest {
  organizationId: string;
  actorUserId: string;
}

export interface GetOrganizationWalletSummaryResponse {
  walletSummary: {
    organizationId: string;
    usageBalanceUsd: string;
    spendCreditsUsd: string;
    pendingEarningsUsd: string;
    withdrawableCashUsd: string;
  };
}

export class GetOrganizationWalletSummaryUseCase {
  public constructor(
    private readonly repository: OrganizationLedgerRepository
  ) {}

  public async execute(
    request: GetOrganizationWalletSummaryRequest
  ): Promise<GetOrganizationWalletSummaryResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new LedgerOrganizationNotFoundError(organizationId.value);
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canManageOrganizationFinances(actorMembership.role)
    ) {
      throw new OrganizationFinanceAuthorizationError();
    }

    return {
      walletSummary: (
        await this.repository.getOrganizationWalletSummary(organizationId)
      ).toSnapshot()
    };
  }
}
