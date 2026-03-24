import type { AuditLog } from "../identity/ports/AuditLog.js";
import { ProviderDisputeDashboard } from "../../domain/dashboard/ProviderDisputeDashboard.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canViewProviderDashboard } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { UsdAmount } from "../../domain/ledger/UsdAmount.js";
import type { ProviderDisputeRepository } from "../dispute/ports/ProviderDisputeRepository.js";

export interface GetProviderDisputeDashboardRequest {
  organizationId: string;
  actorUserId: string;
}

export class ProviderDisputeDashboardOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderDisputeDashboardOrganizationNotFoundError";
  }
}

export class ProviderDisputeDashboardCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before loading provider disputes.",
    );
    this.name = "ProviderDisputeDashboardCapabilityRequiredError";
  }
}

export class ProviderDisputeDashboardAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view provider disputes.",
    );
    this.name = "ProviderDisputeDashboardAuthorizationError";
  }
}

export class GetProviderDisputeDashboardUseCase {
  public constructor(
    private readonly repository: ProviderDisputeRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    request: GetProviderDisputeDashboardRequest,
  ): Promise<{
    dashboard: ReturnType<ProviderDisputeDashboard["toSnapshot"]>;
  }> {
    const viewedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderDisputeDashboardOrganizationNotFoundError(
        organizationId.value,
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderDisputeDashboardCapabilityRequiredError();
    }

    const membership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId,
    );

    if (membership === null || !canViewProviderDashboard(membership.role)) {
      throw new ProviderDisputeDashboardAuthorizationError();
    }

    const disputes = await this.repository.listProviderOrganizationDisputes(
      organizationId,
    );
    const summary = await this.repository.getProviderDisputeSummary({
      providerOrganizationId: organizationId,
      lostSinceInclusive: new Date(
        viewedAt.getTime() - 90 * 24 * 60 * 60 * 1000,
      ),
    });
    const dashboard = ProviderDisputeDashboard.create({
      organizationId: organizationId.value,
      actorRole: membership.role,
      activeDisputeCount: summary.activeDisputeCount,
      activeDisputeHoldUsd: summary.activeDisputeHold.toUsdString(),
      recentLostDisputeCount90d: summary.recentLostDisputeCount,
      disputes: disputes.map((dispute) => {
        const allocatedAmount = dispute.allocations
          .filter(
            (allocation) =>
              allocation.providerOrganizationId.value === organizationId.value,
          )
          .reduce(
            (total, allocation) => total.add(allocation.amount),
            UsdAmount.zero(),
          );

        return {
          id: dispute.id,
          disputeType: dispute.disputeType,
          source: dispute.source,
          status: dispute.status,
          paymentReference: dispute.paymentReference,
          jobReference: dispute.jobReference,
          reasonCode: dispute.reasonCode,
          summary: dispute.summary,
          disputedAmountUsd: dispute.disputedAmount.toUsdString(),
          allocatedAmountUsd: allocatedAmount.toUsdString(),
          activeHoldUsd: dispute.activeAllocatedAmountForProvider(
            organizationId.value,
          ).toUsdString(),
          stripeDisputeId: dispute.stripeDisputeId,
          stripeChargeId: dispute.stripeChargeId,
          stripeReason: dispute.stripeReason,
          stripeStatus: dispute.stripeStatus,
          createdAt: dispute.createdAt.toISOString(),
          updatedAt: dispute.updatedAt.toISOString(),
          resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
        };
      }),
    });
    const snapshot = dashboard.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.provider_disputes.viewed",
      occurredAt: viewedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        activeDisputeCount: snapshot.activeDisputeCount,
        activeDisputeHoldUsd: snapshot.activeDisputeHoldUsd,
        recentLostDisputeCount90d: snapshot.recentLostDisputeCount90d,
        disputeCount: snapshot.disputes.length,
      },
    });

    return {
      dashboard: snapshot,
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[],
  ): boolean {
    return capabilities.includes("provider");
  }
}
