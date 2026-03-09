import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canViewProviderDashboard } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { ProviderDashboardOverview } from "../../domain/dashboard/ProviderDashboardOverview.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { ProviderDashboardRepository } from "./ports/ProviderDashboardRepository.js";

export interface GetProviderDashboardOverviewRequest {
  organizationId: string;
  actorUserId: string;
}

export interface GetProviderDashboardOverviewResponse {
  overview: ReturnType<ProviderDashboardOverview["toSnapshot"]>;
}

export class ProviderDashboardOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderDashboardOrganizationNotFoundError";
  }
}

export class ProviderDashboardCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before loading the provider dashboard."
    );
    this.name = "ProviderDashboardCapabilityRequiredError";
  }
}

export class ProviderDashboardAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view the provider dashboard shell."
    );
    this.name = "ProviderDashboardAuthorizationError";
  }
}

export class GetProviderDashboardOverviewUseCase {
  public constructor(
    private readonly repository: ProviderDashboardRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GetProviderDashboardOverviewRequest
  ): Promise<GetProviderDashboardOverviewResponse> {
    const viewedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderDashboardOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderDashboardCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canViewProviderDashboard(actorMembership.role)
    ) {
      throw new ProviderDashboardAuthorizationError();
    }

    const inventorySummaries =
      await this.repository.listProviderInventorySummaries(organizationId);
    const walletSummary =
      await this.repository.getOrganizationWalletSummary(organizationId);
    const trendWindow = this.resolveTrendWindow(viewedAt);
    const earningsTrend = await this.repository.listProviderDailyEarningsTrend({
      organizationId,
      startDateInclusive: trendWindow.startDateInclusive,
      endDateExclusive: trendWindow.endDateExclusive
    });
    const tokenUsageTrend =
      await this.repository.listProviderDailyTokenUsageTrend({
        organizationId,
        startDateInclusive: trendWindow.startDateInclusive,
        endDateExclusive: trendWindow.endDateExclusive
      });
    const throughputCapacityTokensPerSecond = inventorySummaries.reduce(
      (total, summary) =>
        total + (summary.latestBenchmark?.throughputTokensPerSecond.value ?? 0),
      0
    );
    const overview = ProviderDashboardOverview.create({
      organizationId: organizationId.value,
      actorRole: actorMembership.role,
      inventorySummaries: inventorySummaries.map((summary) =>
        summary.toSnapshot()
      ),
      balances: walletSummary.toSnapshot(),
      earningsTrend: this.buildEarningsTrend({
        dates: trendWindow.dates,
        earningsTrend
      }),
      estimatedUtilizationTrend: this.buildEstimatedUtilizationTrend({
        dates: trendWindow.dates,
        tokenUsageTrend,
        throughputCapacityTokensPerSecond
      })
    });
    const snapshot = overview.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.provider_overview.viewed",
      occurredAt: viewedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        activeNodeCount: snapshot.activeNodeCount,
        healthyNodeCount: snapshot.healthSummary.healthy,
        degradedNodeCount: snapshot.healthSummary.degraded,
        pausedNodeCount: snapshot.healthSummary.paused
      }
    });

    return {
      overview: snapshot
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }

  private resolveTrendWindow(viewedAt: Date): {
    startDateInclusive: Date;
    endDateExclusive: Date;
    dates: string[];
  } {
    const endDateExclusive = this.startOfUtcDay(
      new Date(viewedAt.getTime() + 24 * 60 * 60 * 1000)
    );
    const startDateInclusive = new Date(endDateExclusive);
    startDateInclusive.setUTCDate(startDateInclusive.getUTCDate() - 7);

    return {
      startDateInclusive,
      endDateExclusive,
      dates: this.enumerateUtcDates(startDateInclusive, 7)
    };
  }

  private buildEarningsTrend(input: {
    dates: readonly string[];
    earningsTrend: Awaited<
      ReturnType<ProviderDashboardRepository["listProviderDailyEarningsTrend"]>
    >;
  }): {
    date: string;
    earningsUsd: string;
    reserveHoldbackUsd: string;
  }[] {
    const earningsByDate = new Map(
      input.earningsTrend.map((entry) => [
        entry.date,
        {
          earningsUsd: entry.earnings.toUsdString(),
          reserveHoldbackUsd: entry.reserveHoldback.toUsdString()
        }
      ])
    );

    return input.dates.map((date) => ({
      date,
      earningsUsd: earningsByDate.get(date)?.earningsUsd ?? "0.00",
      reserveHoldbackUsd: earningsByDate.get(date)?.reserveHoldbackUsd ?? "0.00"
    }));
  }

  private buildEstimatedUtilizationTrend(input: {
    dates: readonly string[];
    tokenUsageTrend: Awaited<
      ReturnType<
        ProviderDashboardRepository["listProviderDailyTokenUsageTrend"]
      >
    >;
    throughputCapacityTokensPerSecond: number;
  }): {
    date: string;
    totalTokens: number;
    estimatedUtilizationPercent: number;
  }[] {
    const tokensByDate = new Map(
      input.tokenUsageTrend.map((entry) => [entry.date, entry.totalTokens])
    );

    return input.dates.map((date) => {
      const totalTokens = tokensByDate.get(date) ?? 0;
      const estimatedUtilizationPercent =
        input.throughputCapacityTokensPerSecond === 0
          ? 0
          : this.roundToTwoDecimals(
              (totalTokens /
                (input.throughputCapacityTokensPerSecond * 86_400)) *
                100
            );

      return {
        date,
        totalTokens,
        estimatedUtilizationPercent
      };
    });
  }

  private enumerateUtcDates(startDateInclusive: Date, days: number): string[] {
    return Array.from({ length: days }, (_, offset) => {
      const nextDate = new Date(startDateInclusive);
      nextDate.setUTCDate(startDateInclusive.getUTCDate() + offset);
      return nextDate.toISOString().slice(0, 10);
    });
  }

  private startOfUtcDay(input: Date): Date {
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())
    );
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
