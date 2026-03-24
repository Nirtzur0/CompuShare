import type { AuditLog } from "../identity/ports/AuditLog.js";
import { ConsumerDisputeDashboard } from "../../domain/dashboard/ConsumerDisputeDashboard.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canViewConsumerDashboard } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { UsdAmount } from "../../domain/ledger/UsdAmount.js";
import type { ProviderDisputeRepository } from "../dispute/ports/ProviderDisputeRepository.js";

export interface GetConsumerDisputeDashboardRequest {
  organizationId: string;
  actorUserId: string;
}

export class ConsumerDisputeDashboardOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ConsumerDisputeDashboardOrganizationNotFoundError";
  }
}

export class ConsumerDisputeDashboardCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before loading the dispute workflow.",
    );
    this.name = "ConsumerDisputeDashboardCapabilityRequiredError";
  }
}

export class ConsumerDisputeDashboardAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view the consumer dispute workflow.",
    );
    this.name = "ConsumerDisputeDashboardAuthorizationError";
  }
}

export class GetConsumerDisputeDashboardUseCase {
  public constructor(
    private readonly repository: ProviderDisputeRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    request: GetConsumerDisputeDashboardRequest,
  ): Promise<{
    dashboard: ReturnType<ConsumerDisputeDashboard["toSnapshot"]>;
  }> {
    const viewedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ConsumerDisputeDashboardOrganizationNotFoundError(
        organizationId.value,
      );
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new ConsumerDisputeDashboardCapabilityRequiredError();
    }

    const membership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId,
    );

    if (membership === null || !canViewConsumerDashboard(membership.role)) {
      throw new ConsumerDisputeDashboardAuthorizationError();
    }

    const disputes = await this.repository.listBuyerOrganizationDisputes({
      buyerOrganizationId: organizationId,
    });
    const activeDisputes = disputes.filter((dispute) => dispute.isActiveForExposure());
    const dashboard = ConsumerDisputeDashboard.create({
      organizationId: organizationId.value,
      actorRole: membership.role,
      activeDisputeCount: activeDisputes.length,
      activeDisputeHoldUsd: activeDisputes
        .reduce(
          (total, dispute) => total.add(dispute.activeAllocatedAmount),
          UsdAmount.zero(),
        )
        .toUsdString(),
      disputes: disputes.map((dispute) => ({
        ...dispute.toSnapshot(),
        allocatedAmountUsd: dispute.allocations
          .reduce(
            (total, allocation) => total.add(allocation.amount),
            UsdAmount.zero(),
          )
          .toUsdString(),
        activeHoldUsd: dispute.activeAllocatedAmount.toUsdString(),
      })),
    });
    const snapshot = dashboard.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.consumer_disputes.viewed",
      occurredAt: viewedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        activeDisputeCount: snapshot.activeDisputeCount,
        activeDisputeHoldUsd: snapshot.activeDisputeHoldUsd,
        disputeCount: snapshot.disputes.length,
      },
    });

    return {
      dashboard: snapshot,
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[],
  ): boolean {
    return capabilities.includes("buyer");
  }
}
