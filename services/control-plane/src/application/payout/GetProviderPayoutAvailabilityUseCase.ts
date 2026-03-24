import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canManageOrganizationFinances } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import {
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError,
  ProviderCapabilityRequiredError
} from "../ledger/LedgerErrors.js";
import type { ProviderPayoutRepository } from "./ports/ProviderPayoutRepository.js";

export interface GetProviderPayoutAvailabilityRequest {
  organizationId: string;
  actorUserId: string;
}

export class GetProviderPayoutAvailabilityUseCase {
  public constructor(private readonly repository: ProviderPayoutRepository) {}

  public async execute(request: GetProviderPayoutAvailabilityRequest): Promise<{
      payoutAvailability: {
      organizationId: string;
      pendingEarningsUsd: string;
      reserveHoldbackUsd: string;
      withdrawableCashUsd: string;
      activeDisputeHoldUsd: string;
      eligiblePayoutUsd: string;
      lastPayoutAt: string | null;
      lastPayoutStatus: "none" | "pending" | "paid" | "failed" | "canceled";
    };
  }> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    await assertProviderFinanceAccess(
      this.repository,
      organizationId,
      actorUserId
    );

    return {
      payoutAvailability: (
        await this.repository.getProviderPayoutAvailability(organizationId)
      ).toSnapshot()
    };
  }
}

export async function assertProviderFinanceAccess(
  repository: Pick<
    ProviderPayoutRepository,
    "findOrganizationAccountCapabilities" | "findOrganizationMember"
  >,
  organizationId: OrganizationId,
  actorUserId: UserId
): Promise<void> {
  const capabilities =
    await repository.findOrganizationAccountCapabilities(organizationId);

  if (capabilities === null) {
    throw new LedgerOrganizationNotFoundError(organizationId.value);
  }

  if (!capabilities.includes("provider")) {
    throw new ProviderCapabilityRequiredError();
  }

  const actorMembership = await repository.findOrganizationMember(
    organizationId,
    actorUserId
  );

  if (
    actorMembership === null ||
    !canManageOrganizationFinances(actorMembership.role)
  ) {
    throw new OrganizationFinanceAuthorizationError();
  }
}
