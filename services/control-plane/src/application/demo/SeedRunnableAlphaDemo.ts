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
import type { ReplaceProviderNodeRoutingStateUseCase } from "../provider/ReplaceProviderNodeRoutingStateUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../provider/UpsertProviderNodeRoutingProfileUseCase.js";
import type { CreatePrivateConnectorUseCase } from "../privateConnector/CreatePrivateConnectorUseCase.js";

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
  operationsUrl: string;
  publicSubprocessorsUrl: string;
  gatewayDemo: {
    gatewayUrl: string;
    modelAlias: string;
    curlCommand: string;
  };
  embeddingDemo: {
    gatewayUrl: string;
    modelAlias: string;
    curlCommand: string;
  };
  batchDemo: {
    filesUrl: string;
    batchesUrl: string;
    inputFilePath: string;
    inputJsonl: string;
    uploadCurlCommand: string;
    createCurlCommand: string;
    getCurlCommand: string;
    workerCommand: string;
  };
  buyer: {
    organizationId: string;
    organizationSlug: string;
    actorUserId: string;
    dashboardUrl: string;
    disputesDashboardUrl: string;
    privateConnectorDashboardUrl: string;
    complianceDashboardUrl: string;
    complianceExportCurlCommand: string;
    privateConnectorCurlCommand: string;
    apiKey: {
      id: string;
      environment: string;
      secretPrefix: string;
      secret: string;
    };
    privateConnector: Awaited<
      ReturnType<CreatePrivateConnectorUseCase["execute"]>
    >["connector"];
    consumerOverview: Awaited<
      ReturnType<GetConsumerDashboardOverviewUseCase["execute"]>
    >["overview"];
  };
  provider: {
    organizationId: string;
    organizationSlug: string;
    actorUserId: string;
    dashboardUrl: string;
    disputesDashboardUrl: string;
    pricingDashboardUrl: string;
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
    private readonly replaceProviderNodeRoutingStateUseCase: Pick<
      ReplaceProviderNodeRoutingStateUseCase,
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
    private readonly createPrivateConnectorUseCase: Pick<
      CreatePrivateConnectorUseCase,
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
    const privateConnector = await this.createPrivateConnectorUseCase.execute({
      organizationId: buyerOrganization.organization.id,
      actorUserId: buyerOrganization.founder.userId,
      environment: buyerApiKey.apiKey.environment as
        | "development"
        | "staging"
        | "production",
      label: "Runnable Alpha Private Cluster Connector",
      mode: "cluster",
      endpointUrl: new URL(
        "/v1/private-connectors/chat/completions",
        request.providerRuntimeBaseUrl
      ).toString(),
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct"
        }
      ]
    });
    const providerNode = await this.enrollProviderNodeUseCase.execute({
      organizationId: providerOrganization.organization.id,
      machineId: `demo-provider-node-${seedTag}`,
      label: "Runnable Alpha Warm Node",
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
      throughputTokensPerSecond: 690,
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
        priceFloorUsdPerHour: 8.5
      });
    const backupNode = await this.enrollProviderNodeUseCase.execute({
      organizationId: providerOrganization.organization.id,
      machineId: `demo-provider-node-backup-${seedTag}`,
      label: "Runnable Alpha PricePerf Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: `provider-backup-${seedTag}.internal`,
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
    await this.recordProviderBenchmarkUseCase.execute({
      organizationId: providerOrganization.organization.id,
      providerNodeId: backupNode.node.id,
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 900,
      driverVersion: "550.54.14"
    });
    await this.upsertProviderNodeRoutingProfileUseCase.execute({
      organizationId: providerOrganization.organization.id,
      providerNodeId: backupNode.node.id,
      endpointUrl: this.buildProviderRuntimeEndpointUrl({
        baseUrl: request.providerRuntimeBaseUrl,
        organizationId: providerOrganization.organization.id,
        environment: providerApiKey.apiKey.environment,
        providerNodeId: backupNode.node.id
      }),
      priceFloorUsdPerHour: 10
    });
    await this.replaceProviderNodeRoutingStateUseCase.execute({
      organizationId: providerOrganization.organization.id,
      providerNodeId: providerNode.node.id,
      warmModelAliases: [
        {
          approvedModelAlias: "openai/gpt-oss-120b-like",
          expiresAt: new Date(seededAt.getTime() + 10 * 60 * 1000).toISOString()
        }
      ]
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
        actorUserId: buyerOrganization.founder.userId,
        environment: buyerApiKey.apiKey.environment as
          | "development"
          | "staging"
          | "production"
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
      operationsUrl: new URL("/operations", request.dashboardBaseUrl).toString(),
      publicSubprocessorsUrl: new URL(
        "/subprocessors",
        request.dashboardBaseUrl
      ).toString(),
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
      embeddingDemo: {
        gatewayUrl: new URL(
          "/v1/embeddings",
          request.controlPlaneBaseUrl
        ).toString(),
        modelAlias: "cheap-embed-v1",
        curlCommand: this.buildEmbeddingCurlCommand({
          controlPlaneBaseUrl: request.controlPlaneBaseUrl,
          buyerApiKey: buyerApiKey.secret
        })
      },
      batchDemo: this.buildBatchDemo({
        controlPlaneBaseUrl: request.controlPlaneBaseUrl,
        buyerApiKey: buyerApiKey.secret
      }),
      buyer: {
        organizationId: buyerOrganization.organization.id,
        organizationSlug: buyerOrganization.organization.slug,
        actorUserId: buyerOrganization.founder.userId,
        dashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/consumer",
          organizationId: buyerOrganization.organization.id,
          actorUserId: buyerOrganization.founder.userId,
          environment: buyerApiKey.apiKey.environment
        }),
        disputesDashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/consumer/disputes",
          organizationId: buyerOrganization.organization.id,
          actorUserId: buyerOrganization.founder.userId
        }),
        privateConnectorDashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/consumer/private-connectors",
          organizationId: buyerOrganization.organization.id,
          actorUserId: buyerOrganization.founder.userId
        }),
        complianceDashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/consumer/compliance",
          organizationId: buyerOrganization.organization.id,
          actorUserId: buyerOrganization.founder.userId,
          environment: buyerApiKey.apiKey.environment
        }),
        complianceExportCurlCommand: this.buildComplianceExportCurlCommand({
          controlPlaneBaseUrl: request.controlPlaneBaseUrl,
          organizationId: buyerOrganization.organization.id,
          actorUserId: buyerOrganization.founder.userId,
          environment: buyerApiKey.apiKey.environment
        }),
        privateConnectorCurlCommand: this.buildPrivateConnectorCurlCommand({
          controlPlaneBaseUrl: request.controlPlaneBaseUrl,
          buyerApiKey: buyerApiKey.secret,
          connectorId: privateConnector.connector.id
        }),
        apiKey: {
          id: buyerApiKey.apiKey.id,
          environment: buyerApiKey.apiKey.environment,
          secretPrefix: buyerApiKey.apiKey.secretPrefix,
          secret: buyerApiKey.secret
        },
        privateConnector: privateConnector.connector,
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
        disputesDashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/provider/disputes",
          organizationId: providerOrganization.organization.id,
          actorUserId: providerOrganization.founder.userId
        }),
        pricingDashboardUrl: this.buildDashboardUrl({
          baseUrl: request.dashboardBaseUrl,
          pathname: "/provider/pricing",
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
    environment?: string;
  }): string {
    const url = new URL(input.pathname, input.baseUrl);
    url.searchParams.set("organizationId", input.organizationId);
    url.searchParams.set("actorUserId", input.actorUserId);
    if (input.environment !== undefined) {
      url.searchParams.set("environment", input.environment);
    }
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

  private buildComplianceExportCurlCommand(input: {
    controlPlaneBaseUrl: string;
    organizationId: string;
    actorUserId: string;
    environment: string;
  }): string {
    const exportUrl = new URL(
      `/v1/organizations/${input.organizationId}/compliance/dpa-export`,
      input.controlPlaneBaseUrl
    );
    exportUrl.searchParams.set("actorUserId", input.actorUserId);
    exportUrl.searchParams.set("environment", input.environment);

    return ["curl -sS", `'${exportUrl.toString()}'`].join(" ");
  }

  private buildEmbeddingCurlCommand(input: {
    controlPlaneBaseUrl: string;
    buyerApiKey: string;
  }): string {
    const embeddingUrl = new URL(
      "/v1/embeddings",
      input.controlPlaneBaseUrl
    ).toString();

    return [
      "curl -sS",
      `-H 'Authorization: Bearer ${input.buyerApiKey}'`,
      "-H 'Content-Type: application/json'",
      `-X POST '${embeddingUrl}'`,
      `-d '{"model":"cheap-embed-v1","input":["hello world","provider marketplace"]}'`
      ].join(" ");
  }

  private buildPrivateConnectorCurlCommand(input: {
    controlPlaneBaseUrl: string;
    buyerApiKey: string;
    connectorId: string;
  }): string {
    return [
      "curl -sS",
      `-H "Authorization: Bearer ${input.buyerApiKey}"`,
      '-H "Content-Type: application/json"',
      `-H "x-compushare-private-connector-id: ${input.connectorId}"`,
      "-X POST",
      new URL("/v1/chat/completions", input.controlPlaneBaseUrl).toString(),
      `-d '${JSON.stringify({
        model: "openai/gpt-oss-120b-like",
        messages: [
          {
            role: "user",
            content: "Route this request through the private connector."
          }
        ]
      })}'`
    ].join(" ");
  }

  private buildBatchDemo(input: {
    controlPlaneBaseUrl: string;
    buyerApiKey: string;
  }): SeedRunnableAlphaDemoResponse["batchDemo"] {
    const filesUrl = new URL("/v1/files", input.controlPlaneBaseUrl).toString();
    const batchesUrl = new URL(
      "/v1/batches",
      input.controlPlaneBaseUrl
    ).toString();
    const inputFilePath = "/tmp/compushare-batch-input.jsonl";
    const inputJsonl = [
      JSON.stringify({
        custom_id: "embed-1",
        method: "POST",
        url: "/v1/embeddings",
        body: {
          model: "cheap-embed-v1",
          input: "hello world"
        }
      }),
      JSON.stringify({
        custom_id: "chat-1",
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Summarize warm-cache routing." }]
        }
      })
    ].join("\n");

    return {
      filesUrl,
      batchesUrl,
      inputFilePath,
      inputJsonl,
      uploadCurlCommand: [
        "curl -sS",
        `-H 'Authorization: Bearer ${input.buyerApiKey}'`,
        `-F 'purpose=batch'`,
        `-F 'file=@${inputFilePath};type=application/jsonl'`,
        `-X POST '${filesUrl}'`
      ].join(" "),
      createCurlCommand: [
        "curl -sS",
        `-H 'Authorization: Bearer ${input.buyerApiKey}'`,
        "-H 'Content-Type: application/json'",
        `-X POST '${batchesUrl}'`,
        `-d '{"input_file_id":"<uploaded_file_id>","endpoint":"/v1/embeddings","completion_window":"24h"}'`
      ].join(" "),
      getCurlCommand: [
        "curl -sS",
        `-H 'Authorization: Bearer ${input.buyerApiKey}'`,
        `-X GET '${batchesUrl}/<batch_id>'`
      ].join(" "),
      workerCommand: "pnpm dev:batch-worker"
    };
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
        maxPriceUsdPerHour: 10,
        approvedModelAlias: "openai/gpt-oss-120b-like"
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
