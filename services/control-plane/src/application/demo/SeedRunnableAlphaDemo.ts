import { randomUUID } from "node:crypto";
import type { GetConsumerDashboardOverviewUseCase } from "../dashboard/GetConsumerDashboardOverviewUseCase.js";
import type { GetProviderDashboardOverviewUseCase } from "../dashboard/GetProviderDashboardOverviewUseCase.js";
import type { RecordGatewayUsageMeterEventUseCase } from "../metering/RecordGatewayUsageMeterEventUseCase.js";
import type { RecordCompletedJobSettlementUseCase } from "../ledger/RecordCompletedJobSettlementUseCase.js";
import type { RecordCustomerChargeUseCase } from "../ledger/RecordCustomerChargeUseCase.js";
import type { CreateOrganizationUseCase } from "../identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../identity/IssueOrganizationApiKeyUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../placement/ResolveSyncPlacementUseCase.js";
import type { EnrollProviderNodeUseCase } from "../provider/EnrollProviderNodeUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../provider/UpsertProviderNodeRoutingProfileUseCase.js";

export interface SeedRunnableAlphaDemoRequest {
  controlPlaneBaseUrl: string;
  providerRuntimeBaseUrl: string;
  dashboardBaseUrl: string;
  seedTag?: string;
}

export interface SeedRunnableAlphaDemoResponse {
  seedTag: string;
  seededAt: string;
  controlPlaneBaseUrl: string;
  providerRuntimeBaseUrl: string;
  dashboardBaseUrl: string;
  gatewayDemo: {
    gatewayUrl: string;
    modelAlias: string;
    curlCommand: string;
  };
  buyer: {
    organizationId: string;
    organizationSlug: string;
    actorUserId: string;
    dashboardUrl: string;
    apiKey: {
      id: string;
      environment: string;
      secretPrefix: string;
      secret: string;
    };
    consumerOverview: Awaited<
      ReturnType<GetConsumerDashboardOverviewUseCase["execute"]>
    >["overview"];
  };
  provider: {
    organizationId: string;
    organizationSlug: string;
    actorUserId: string;
    dashboardUrl: string;
    apiKey: {
      id: string;
      environment: string;
      secretPrefix: string;
      secret: string;
    };
    node: Awaited<ReturnType<EnrollProviderNodeUseCase["execute"]>>["node"];
    benchmark: Awaited<
      ReturnType<RecordProviderBenchmarkUseCase["execute"]>
    >["benchmark"];
    routingProfile: Awaited<
      ReturnType<UpsertProviderNodeRoutingProfileUseCase["execute"]>
    >["routingProfile"];
    providerOverview: Awaited<
      ReturnType<GetProviderDashboardOverviewUseCase["execute"]>
    >["overview"];
  };
}

export class SeedRunnableAlphaDemo {
  public constructor(
    private readonly createOrganizationUseCase: Pick<
      CreateOrganizationUseCase,
      "execute"
    >,
    private readonly issueOrganizationApiKeyUseCase: Pick<
      IssueOrganizationApiKeyUseCase,
      "execute"
    >,
    private readonly enrollProviderNodeUseCase: Pick<
      EnrollProviderNodeUseCase,
      "execute"
    >,
    private readonly recordProviderBenchmarkUseCase: Pick<
      RecordProviderBenchmarkUseCase,
      "execute"
    >,
    private readonly upsertProviderNodeRoutingProfileUseCase: Pick<
      UpsertProviderNodeRoutingProfileUseCase,
      "execute"
    >,
    private readonly recordCustomerChargeUseCase: Pick<
      RecordCustomerChargeUseCase,
      "execute"
    >,
    private readonly recordCompletedJobSettlementUseCase: Pick<
      RecordCompletedJobSettlementUseCase,
      "execute"
    >,
    private readonly resolveSyncPlacementUseCase: Pick<
      ResolveSyncPlacementUseCase,
      "execute"
    >,
    private readonly recordGatewayUsageMeterEventUseCase: Pick<
      RecordGatewayUsageMeterEventUseCase,
      "execute"
    >,
    private readonly getConsumerDashboardOverviewUseCase: Pick<
      GetConsumerDashboardOverviewUseCase,
      "execute"
    >,
    private readonly getProviderDashboardOverviewUseCase: Pick<
      GetProviderDashboardOverviewUseCase,
      "execute"
    >,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: SeedRunnableAlphaDemoRequest
  ): Promise<SeedRunnableAlphaDemoResponse> {
    const seededAt = this.clock();
    const seedTag = this.normalizeSeedTag(
      request.seedTag ?? seededAt.toISOString()
    );
    const buyerOrganization = await this.createOrganizationUseCase.execute({
      organizationName: "Runnable Alpha Buyer",
      organizationSlug: `demo-buyer-${seedTag}`,
      founderEmail: `buyer-${seedTag}@example.com`,
      founderDisplayName: "Runnable Alpha Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const providerOrganization = await this.createOrganizationUseCase.execute({
      organizationName: "Runnable Alpha Provider",
      organizationSlug: `demo-provider-${seedTag}`,
      founderEmail: `provider-${seedTag}@example.com`,
      founderDisplayName: "Runnable Alpha Provider Owner",
      accountCapabilities: ["provider"]
    });
    const buyerApiKey = await this.issueOrganizationApiKeyUseCase.execute({
      organizationId: buyerOrganization.organization.id,
      actorUserId: buyerOrganization.founder.userId,
      label: "Runnable alpha buyer key",
      environment: "development"
    });
    const providerApiKey = await this.issueOrganizationApiKeyUseCase.execute({
      organizationId: providerOrganization.organization.id,
      actorUserId: providerOrganization.founder.userId,
      label: "Runnable alpha provider key",
      environment: "development"
    });
    const providerNode = await this.enrollProviderNodeUseCase.execute({
      organizationId: providerOrganization.organization.id,
      machineId: `demo-provider-node-${seedTag}`,
      label: "Runnable Alpha Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: `provider-${seedTag}.internal`,
      inventory: {
        driverVersion: "550.54.14",
        gpus: [
          {
            model: "NVIDIA A100",
            vramGb: 80,
            count: 4,
            interconnect: "NVLink"
          }
        ]
      }
    });
    const benchmark = await this.recordProviderBenchmarkUseCase.execute({
      organizationId: providerOrganization.organization.id,
      providerNodeId: providerNode.node.id,
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 742.5,
      driverVersion: "550.54.14"
    });
    const routingProfile =
      await this.upsertProviderNodeRoutingProfileUseCase.execute({
        organizationId: providerOrganization.organization.id,
        providerNodeId: providerNode.node.id,
        endpointUrl: this.buildProviderRuntimeEndpointUrl({
          baseUrl: request.providerRuntimeBaseUrl,
          organizationId: providerOrganization.organization.id,
          environment: providerApiKey.apiKey.environment,
          providerNodeId: providerNode.node.id
        }),
        priceFloorUsdPerHour: 9.5
      });

    await this.recordCustomerChargeUseCase.execute({
      organizationId: buyerOrganization.organization.id,
      actorUserId: buyerOrganization.founder.userId,
      amountUsd: "100.00",
      paymentReference: `demo-charge-${seedTag}`,
      occurredAt: this.shiftIsoDays(seededAt, -6, 9)
    });
    await this.seedSettlementHistory({
      seededAt,
      seedTag,
      buyerOrganizationId: buyerOrganization.organization.id,
      buyerActorUserId: buyerOrganization.founder.userId,
      providerOrganizationId: providerOrganization.organization.id
    });
    await this.seedGatewayUsageHistory({
      seededAt,
      buyerOrganizationId: buyerOrganization.organization.id,
      buyerActorUserId: buyerOrganization.founder.userId,
      providerEnvironment: providerApiKey.apiKey.environment
    });

    const consumerOverview =
      await this.getConsumerDashboardOverviewUseCase.execute({
        organizationId: buyerOrganization.organization.id,
        actorUserId: buyerOrganization.founder.userId
      });
    const providerOverview =
      await this.getProviderDashboardOverviewUseCase.execute({
        organizationId: providerOrganization.organization.id,
        actorUserId: providerOrganization.founder.userId
      });

    return {
      seedTag,
      seededAt: seededAt.toISOString(),
      controlPlaneBaseUrl: request.controlPlaneBaseUrl,
      providerRuntimeBaseUrl: request.providerRuntimeBaseUrl,
      dashboardBaseUrl: request.dashboardBaseUrl,
      gatewayDemo: {
        gatewayUrl: new URL(
          "/v1/chat/completions",
          request.controlPlaneBaseUrl
        ).toString(),
        modelAlias: "openai/gpt-oss-120b-like",
        curlCommand: this.buildGatewayCurlCommand({
          controlPlaneBaseUrl: request.controlPlaneBaseUrl,
          buyerApiKey: buyerApiKey.secret
        })
      },
      buyer: {
        organizationId: buyerOrganization.organization.id,
        organizationSlug: buyerOrganization.organization.slug,
        actorUserId: buyerOrganization.founder.userId,
        dashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/consumer",
          organizationId: buyerOrganization.organization.id,
          actorUserId: buyerOrganization.founder.userId
        }),
        apiKey: {
          id: buyerApiKey.apiKey.id,
          environment: buyerApiKey.apiKey.environment,
          secretPrefix: buyerApiKey.apiKey.secretPrefix,
          secret: buyerApiKey.secret
        },
        consumerOverview: consumerOverview.overview
      },
      provider: {
        organizationId: providerOrganization.organization.id,
        organizationSlug: providerOrganization.organization.slug,
        actorUserId: providerOrganization.founder.userId,
        dashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/provider",
          organizationId: providerOrganization.organization.id,
          actorUserId: providerOrganization.founder.userId
        }),
        apiKey: {
          id: providerApiKey.apiKey.id,
          environment: providerApiKey.apiKey.environment,
          secretPrefix: providerApiKey.apiKey.secretPrefix,
          secret: providerApiKey.secret
        },
        node: providerNode.node,
        benchmark: benchmark.benchmark,
        routingProfile: routingProfile.routingProfile,
        providerOverview: providerOverview.overview
      }
    };
  }

  private normalizeSeedTag(rawValue: string): string {
    const normalizedValue = rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (normalizedValue.length < 4) {
      throw new Error("Seed tag must normalize to at least 4 characters.");
    }

    return normalizedValue.slice(0, 40);
  }

  private buildDashboardUrl(input: {
    baseUrl: string;
    pathname: string;
    organizationId: string;
    actorUserId: string;
  }): string {
    const url = new URL(input.pathname, input.baseUrl);
    url.searchParams.set("organizationId", input.organizationId);
    url.searchParams.set("actorUserId", input.actorUserId);
    return url.toString();
  }

  private buildProviderRuntimeEndpointUrl(input: {
    baseUrl: string;
    organizationId: string;
    environment: string;
    providerNodeId: string;
  }): string {
    const url = new URL("/v1/chat/completions", input.baseUrl);
    url.searchParams.set("organizationId", input.organizationId);
    url.searchParams.set("environment", input.environment);
    url.searchParams.set("providerNodeId", input.providerNodeId);
    return url.toString();
  }

  private buildGatewayCurlCommand(input: {
    controlPlaneBaseUrl: string;
    buyerApiKey: string;
  }): string {
    const gatewayUrl = new URL(
      "/v1/chat/completions",
      input.controlPlaneBaseUrl
    ).toString();

    return [
      "curl -sS",
      `-H 'Authorization: Bearer ${input.buyerApiKey}'`,
      "-H 'Content-Type: application/json'",
      `-X POST '${gatewayUrl}'`,
      '-d \'{"model":"openai/gpt-oss-120b-like","messages":[{"role":"user","content":"Hello from the local gateway demo"}]}\''
    ].join(" ");
  }

  private async seedSettlementHistory(input: {
    seededAt: Date;
    seedTag: string;
    buyerOrganizationId: string;
    buyerActorUserId: string;
    providerOrganizationId: string;
  }): Promise<void> {
    const settlements = [
      {
        offsetDays: -5,
        providerPayableUsd: "12.00",
        platformRevenueUsd: "2.00",
        reserveHoldbackUsd: "0.50"
      },
      {
        offsetDays: -3,
        providerPayableUsd: "17.00",
        platformRevenueUsd: "2.00",
        reserveHoldbackUsd: "0.50"
      },
      {
        offsetDays: -1,
        providerPayableUsd: "13.00",
        platformRevenueUsd: "2.00",
        reserveHoldbackUsd: "1.00"
      }
    ] as const;

    for (const [index, settlement] of settlements.entries()) {
      await this.recordCompletedJobSettlementUseCase.execute({
        organizationId: input.buyerOrganizationId,
        actorUserId: input.buyerActorUserId,
        providerOrganizationId: input.providerOrganizationId,
        providerPayableUsd: settlement.providerPayableUsd,
        platformRevenueUsd: settlement.platformRevenueUsd,
        reserveHoldbackUsd: settlement.reserveHoldbackUsd,
        jobReference: `demo-job-${input.seedTag}-${String(index + 1).padStart(2, "0")}`,
        occurredAt: this.shiftIsoDays(input.seededAt, settlement.offsetDays, 11)
      });
    }
  }

  private async seedGatewayUsageHistory(input: {
    seededAt: Date;
    buyerOrganizationId: string;
    buyerActorUserId: string;
    providerEnvironment: string;
  }): Promise<void> {
    const usageHistory = [
      { offsetDays: -6, totalTokens: 2_100, latencyMs: 228 },
      { offsetDays: -5, totalTokens: 2_460, latencyMs: 216 },
      { offsetDays: -4, totalTokens: 2_820, latencyMs: 209 },
      { offsetDays: -3, totalTokens: 3_040, latencyMs: 201 },
      { offsetDays: -2, totalTokens: 3_360, latencyMs: 194 },
      { offsetDays: -1, totalTokens: 3_720, latencyMs: 188 },
      { offsetDays: 0, totalTokens: 3_980, latencyMs: 182 }
    ] as const;

    for (const usageEvent of usageHistory) {
      const placement = await this.resolveSyncPlacementUseCase.execute({
        organizationId: input.buyerOrganizationId,
        environment: input.providerEnvironment,
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      });

      await this.recordGatewayUsageMeterEventUseCase.execute({
        workloadBundleId: randomUUID(),
        occurredAt: this.shiftIsoDays(
          input.seededAt,
          usageEvent.offsetDays,
          14
        ),
        actorUserId: input.buyerActorUserId,
        customerOrganizationId: input.buyerOrganizationId,
        providerOrganizationId: placement.selection.providerOrganizationId,
        providerNodeId: placement.selection.providerNodeId,
        environment: input.providerEnvironment as
          | "development"
          | "staging"
          | "production",
        approvedModelAlias: "openai/gpt-oss-120b-like",
        manifestId: "chat-gpt-oss-120b-like-v1",
        decisionLogId: placement.decisionLogId,
        promptTokens: Math.floor(usageEvent.totalTokens * 0.42),
        completionTokens:
          usageEvent.totalTokens - Math.floor(usageEvent.totalTokens * 0.42),
        totalTokens: usageEvent.totalTokens,
        latencyMs: usageEvent.latencyMs
      });
    }
  }

  private shiftIsoDays(
    baseDate: Date,
    offsetDays: number,
    hourUtc: number
  ): string {
    const shiftedDate = new Date(baseDate);
    shiftedDate.setUTCDate(shiftedDate.getUTCDate() + offsetDays);
    shiftedDate.setUTCHours(hourUtc, 0, 0, 0);
    return shiftedDate.toISOString();
  }
}
