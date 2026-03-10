import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canViewProviderDashboard } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { ProviderPricingSimulator } from "../../domain/dashboard/ProviderPricingSimulator.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { ProviderPricingSimulatorRepository } from "./ports/ProviderPricingSimulatorRepository.js";

export interface GetProviderPricingSimulatorRequest {
  organizationId: string;
  actorUserId: string;
}

export interface GetProviderPricingSimulatorResponse {
  simulator: ReturnType<ProviderPricingSimulator["toSnapshot"]>;
}

export class ProviderPricingSimulatorOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderPricingSimulatorOrganizationNotFoundError";
  }
}

export class ProviderPricingSimulatorCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before loading the provider pricing simulator."
    );
    this.name = "ProviderPricingSimulatorCapabilityRequiredError";
  }
}

export class ProviderPricingSimulatorAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view the provider pricing simulator."
    );
    this.name = "ProviderPricingSimulatorAuthorizationError";
  }
}

export class GetProviderPricingSimulatorUseCase {
  private static readonly usageObservationDays = 7;
  private static readonly settlementEconomicsDays = 30;
  private static readonly projectionDays = 30;

  public constructor(
    private readonly repository: ProviderPricingSimulatorRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GetProviderPricingSimulatorRequest
  ): Promise<GetProviderPricingSimulatorResponse> {
    const viewedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderPricingSimulatorOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderPricingSimulatorCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canViewProviderDashboard(actorMembership.role)
    ) {
      throw new ProviderPricingSimulatorAuthorizationError();
    }

    const inventorySummaries =
      await this.repository.listProviderInventorySummaries(organizationId);
    const usageWindow = this.resolveWindow(
      viewedAt,
      GetProviderPricingSimulatorUseCase.usageObservationDays
    );
    const settlementWindow = this.resolveWindow(
      viewedAt,
      GetProviderPricingSimulatorUseCase.settlementEconomicsDays
    );
    const [nodeUsageTotals, settlementEconomics] = await Promise.all([
      this.repository.listProviderNodeUsageTotals({
        organizationId,
        startDateInclusive: usageWindow.startDateInclusive,
        endDateExclusive: usageWindow.endDateExclusive
      }),
      this.repository.getProviderSettlementEconomics({
        organizationId,
        startDateInclusive: settlementWindow.startDateInclusive,
        endDateExclusive: settlementWindow.endDateExclusive
      })
    ]);
    const simulator = ProviderPricingSimulator.create({
      organizationId: organizationId.value,
      actorRole: actorMembership.role,
      inventorySummaries: inventorySummaries.map((summary) => summary.toSnapshot()),
      nodeUsageByNodeId: new Map(
        nodeUsageTotals.map((entry) => [entry.providerNodeId, entry.totalTokens])
      ),
      usageObservationDays: GetProviderPricingSimulatorUseCase.usageObservationDays,
      settlementEconomicsDays:
        GetProviderPricingSimulatorUseCase.settlementEconomicsDays,
      projectionDays: GetProviderPricingSimulatorUseCase.projectionDays,
      settlementCount: settlementEconomics.settlementCount,
      realizedPlatformFeePercent: this.deriveRatePercent({
        numeratorCents: settlementEconomics.platformRevenue.cents,
        denominatorCents: this.resolveSettlementGrossCents(settlementEconomics)
      }),
      realizedReserveHoldbackPercent: this.deriveRatePercent({
        numeratorCents: settlementEconomics.reserveHoldback.cents,
        denominatorCents: this.resolveSettlementGrossCents(settlementEconomics)
      }),
      realizedWithdrawablePercent: this.deriveRatePercent({
        numeratorCents: Math.max(
          settlementEconomics.providerPayable.cents -
            settlementEconomics.reserveHoldback.cents,
          0
        ),
        denominatorCents: this.resolveSettlementGrossCents(settlementEconomics)
      })
    });
    const snapshot = simulator.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.provider_pricing_simulator.viewed",
      occurredAt: viewedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        simulatableNodeCount: snapshot.simulatableNodeCount,
        unavailableNodeCount: snapshot.unavailableNodeCount,
        settlementCount: snapshot.assumptions.settlementCount,
        netProjectionStatus: snapshot.assumptions.netProjectionStatus
      }
    });

    return {
      simulator: snapshot
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }

  private resolveWindow(viewedAt: Date, days: number): {
    startDateInclusive: Date;
    endDateExclusive: Date;
  } {
    const endDateExclusive = this.startOfUtcDay(
      new Date(viewedAt.getTime() + 24 * 60 * 60 * 1000)
    );
    const startDateInclusive = new Date(endDateExclusive);
    startDateInclusive.setUTCDate(startDateInclusive.getUTCDate() - days);

    return {
      startDateInclusive,
      endDateExclusive
    };
  }

  private startOfUtcDay(input: Date): Date {
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())
    );
  }

  private resolveSettlementGrossCents(input: {
    providerPayable: { cents: number };
    platformRevenue: { cents: number };
    reserveHoldback: { cents: number };
  }): number {
    return (
      input.providerPayable.cents +
      input.platformRevenue.cents +
      input.reserveHoldback.cents
    );
  }

  private deriveRatePercent(input: {
    numeratorCents: number;
    denominatorCents: number;
  }): number | null {
    if (input.denominatorCents === 0) {
      return null;
    }

    return Math.round((input.numeratorCents / input.denominatorCents) * 10_000) / 100;
  }
}
