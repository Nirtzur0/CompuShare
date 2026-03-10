import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { z } from "zod";
import { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import { ReplaceProviderNodeRoutingStateUseCase } from "../../../src/application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { PlacementScoringPolicy } from "../../../src/config/PlacementScoringPolicy.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

interface PgMemModule {
  Pool: new () => Pool;
}

const createOrganizationResponseSchema = z.object({
  organization: z.object({
    id: z.uuid()
  }),
  founder: z.object({
    userId: z.uuid()
  })
});

const issueApiKeyResponseSchema = z.object({
  secret: z.string()
});

const enrollProviderNodeResponseSchema = z.object({
  node: z.object({
    id: z.uuid()
  })
});

const recordBenchmarkResponseSchema = z.object({
  benchmark: z.object({
    id: z.uuid()
  })
});

const resolveSyncPlacementResponseSchema = z.object({
  decisionLogId: z.uuid(),
  candidateCount: z.number().int().min(1),
  selection: z.object({
    providerNodeId: z.uuid(),
    providerOrganizationId: z.uuid(),
    providerNodeLabel: z.string(),
    endpointUrl: z.url(),
    region: z.string(),
    trustTier: z.enum(["t0_community", "t1_vetted", "t2_attested"]),
    priceFloorUsdPerHour: z.number(),
    score: z.number(),
    scoreBreakdown: z.object({
      pricePerformanceScore: z.number(),
      warmCacheMultiplier: z.number(),
      benchmarkThroughputTokensPerSecond: z.number(),
      priceFloorUsdPerHour: z.number()
    }),
    warmCache: z.object({
      matched: z.boolean(),
      expiresAt: z.iso.datetime().nullable()
    }),
    matchedGpu: z.object({
      model: z.string(),
      vramGb: z.number(),
      count: z.number(),
      interconnect: z.string().nullable()
    }),
    latestBenchmark: z
      .object({
        id: z.uuid(),
        providerNodeId: z.uuid(),
        gpuClass: z.string(),
        vramGb: z.number(),
        throughputTokensPerSecond: z.number(),
        driverVersion: z.string(),
        recordedAt: z.iso.datetime()
      })
      .nullable()
  })
});

describe("sync placement route", () => {
  let pool: Pool;

  beforeAll(async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    pool = new pgAdapter.Pool();

    const schemaInitializer = new IdentitySchemaInitializer(pool);
    await schemaInitializer.ensureSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("selects one deterministic endpoint and persists the placement decision log", async () => {
    const repository = new PostgresIdentityRepository(
      pool,
      () => new Date("2026-03-14T08:23:00.000Z")
    );
    const auditLog = new StructuredConsoleAuditLog();
    const approvedChatModelCatalog =
      InMemoryApprovedChatModelCatalog.createDefault();
    let apiKeySequence = 0;
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T08:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T08:00:00.000Z"),
          () => "unused-placement-token-0002"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T08:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T08:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-14T08:05:00.000Z"),
        () =>
          `csk_sync_placement_secret_${String(apiKeySequence++).padStart(6, "0")}`
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T08:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T08:10:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T08:15:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T08:25:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      issueProviderNodeAttestationChallengeUseCase: {
        execute: () =>
          Promise.reject(
            new Error("unused provider attestation challenge path")
          )
      },
      submitProviderNodeAttestationUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider attestation submit path"))
      },
      replaceProviderNodeRoutingStateUseCase:
        new ReplaceProviderNodeRoutingStateUseCase(
          repository,
          approvedChatModelCatalog,
          PlacementScoringPolicy.createDefault(),
          auditLog,
          () => new Date("2026-03-14T08:22:00.000Z")
        ),
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T08:20:00.000Z")
        ),
      listProviderBenchmarkHistoryUseCase:
        new ListProviderBenchmarkHistoryUseCase(repository),
      admitProviderRuntimeWorkloadBundleUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider runtime admission path"))
      },
      recordCustomerChargeUseCase: {
        execute: () => Promise.reject(new Error("unused finance charge path"))
      },

      recordCompletedJobSettlementUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance settlement path"))
      },

      getStagedPayoutExportUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance payout export path"))
      },

      getOrganizationWalletSummaryUseCase: {
        execute: () => Promise.reject(new Error("unused finance wallet path"))
      },
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },

      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway chat path"))
      }
    });

    const buyer = await createOrganization(app, {
      name: "Resolve Buyer",
      slug: "resolve-buyer",
      founderEmail: "resolve-buyer@example.com",
      founderDisplayName: "Resolve Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const buyerApiKey = await issueApiKey(app, buyer, "Buyer resolve key");

    const firstProvider = await createOrganization(app, {
      name: "Resolve Provider Alpha",
      slug: "resolve-provider-alpha",
      founderEmail: "resolve-provider-alpha@example.com",
      founderDisplayName: "Resolve Provider Alpha Owner",
      accountCapabilities: ["provider"]
    });
    const secondProvider = await createOrganization(app, {
      name: "Resolve Provider Beta",
      slug: "resolve-provider-beta",
      founderEmail: "resolve-provider-beta@example.com",
      founderDisplayName: "Resolve Provider Beta Owner",
      accountCapabilities: ["provider"]
    });

    const firstProviderApiKey = await issueApiKey(
      app,
      firstProvider,
      "Provider alpha key"
    );
    const secondProviderApiKey = await issueApiKey(
      app,
      secondProvider,
      "Provider beta key"
    );

    const expensiveNode = await enrollNode(app, {
      organizationId: firstProvider.organizationId,
      apiKey: firstProviderApiKey,
      machineId: "resolve-provider-alpha-expensive-0001",
      label: "Alpha Expensive",
      region: "eu-central-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });
    const selectedNode = await enrollNode(app, {
      organizationId: secondProvider.organizationId,
      apiKey: secondProviderApiKey,
      machineId: "resolve-provider-beta-cheap-0001",
      label: "Beta Cheap",
      region: "eu-central-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });

    await upsertRoutingProfile(
      app,
      firstProvider.organizationId,
      firstProviderApiKey,
      expensiveNode.nodeId,
      9.5
    );
    await upsertRoutingProfile(
      app,
      secondProvider.organizationId,
      secondProviderApiKey,
      selectedNode.nodeId,
      5.25
    );
    await recordBenchmark(
      app,
      firstProvider.organizationId,
      firstProviderApiKey,
      expensiveNode.nodeId,
      701.1
    );
    await recordBenchmark(
      app,
      secondProvider.organizationId,
      secondProviderApiKey,
      selectedNode.nodeId,
      736.9
    );

    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyer.organizationId}/environments/production/placements/sync`,
      headers: { "x-api-key": buyerApiKey },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = resolveSyncPlacementResponseSchema.parse(
      JSON.parse(response.body)
    );
    expect(payload.candidateCount).toBe(2);
    expect(payload.selection.providerNodeId).toBe(selectedNode.nodeId);
    expect(payload.selection.priceFloorUsdPerHour).toBe(5.25);
    expect(payload.selection.score).toBeGreaterThan(0);
    expect(payload.selection.endpointUrl).toBe(
      `https://${selectedNode.nodeId}.example.com/v1/chat/completions`
    );

    const logResult = await pool.query<{
      id: string;
      organization_id: string;
      environment: string;
      gpu_class: string;
      min_vram_gb: number;
      region: string;
      minimum_trust_tier: string;
      max_price_usd_per_hour: number;
      candidate_count: number;
      selected_provider_node_id: string | null;
      selected_provider_organization_id: string | null;
      rejection_reason: string | null;
    }>(
      `
        SELECT
          id,
          organization_id,
          environment,
          gpu_class,
          min_vram_gb,
          region,
          minimum_trust_tier,
          max_price_usd_per_hour,
          candidate_count,
          selected_provider_node_id,
          selected_provider_organization_id,
          rejection_reason
        FROM placement_decision_logs
        WHERE id = $1
      `,
      [payload.decisionLogId]
    );

    expect(logResult.rows).toHaveLength(1);
    expect(logResult.rows[0]).toMatchObject({
      organization_id: buyer.organizationId,
      environment: "production",
      gpu_class: "nvidia a100",
      min_vram_gb: 80,
      region: "eu-central-1",
      minimum_trust_tier: "t1_vetted",
      max_price_usd_per_hour: 10,
      candidate_count: 2,
      selected_provider_node_id: selectedNode.nodeId,
      selected_provider_organization_id: secondProvider.organizationId,
      rejection_reason: null
    });

    await app.close();
  });

  it("selects the warmed node when an approved alias is provided", async () => {
    const repository = new PostgresIdentityRepository(
      pool,
      () => new Date("2026-03-14T09:23:00.000Z")
    );
    const auditLog = new StructuredConsoleAuditLog();
    const approvedChatModelCatalog =
      InMemoryApprovedChatModelCatalog.createDefault();
    let apiKeySequence = 0;
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T09:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T09:00:00.000Z"),
          () => "unused-placement-token-0003"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T09:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T09:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-14T09:05:00.000Z"),
        () =>
          `csk_sync_placement_warm_secret_${String(apiKeySequence++).padStart(6, "0")}`
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T09:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T09:10:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T09:15:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-14T09:25:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      issueProviderNodeAttestationChallengeUseCase: {
        execute: () =>
          Promise.reject(
            new Error("unused provider attestation challenge path")
          )
      },
      submitProviderNodeAttestationUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider attestation submit path"))
      },
      replaceProviderNodeRoutingStateUseCase:
        new ReplaceProviderNodeRoutingStateUseCase(
          repository,
          approvedChatModelCatalog,
          PlacementScoringPolicy.createDefault(),
          auditLog,
          () => new Date("2026-03-14T09:22:00.000Z")
        ),
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-14T09:20:00.000Z")
        ),
      listProviderBenchmarkHistoryUseCase:
        new ListProviderBenchmarkHistoryUseCase(repository),
      admitProviderRuntimeWorkloadBundleUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider runtime admission path"))
      },
      recordCustomerChargeUseCase: {
        execute: () => Promise.reject(new Error("unused finance charge path"))
      },
      recordCompletedJobSettlementUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance settlement path"))
      },
      getStagedPayoutExportUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance payout export path"))
      },
      getOrganizationWalletSummaryUseCase: {
        execute: () => Promise.reject(new Error("unused finance wallet path"))
      },
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway chat path"))
      }
    });

    const buyer = await createOrganization(app, {
      name: "Warm Resolve Buyer",
      slug: "warm-resolve-buyer",
      founderEmail: "warm-resolve-buyer@example.com",
      founderDisplayName: "Warm Resolve Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const buyerApiKey = await issueApiKey(app, buyer, "Buyer warm resolve key");
    const provider = await createOrganization(app, {
      name: "Warm Resolve Provider",
      slug: "warm-resolve-provider",
      founderEmail: "warm-resolve-provider@example.com",
      founderDisplayName: "Warm Resolve Provider Owner",
      accountCapabilities: ["provider"]
    });
    const providerApiKey = await issueApiKey(
      app,
      provider,
      "Provider warm key"
    );

    const warmNode = await enrollNode(app, {
      organizationId: provider.organizationId,
      apiKey: providerApiKey,
      machineId: "resolve-provider-warm-0001",
      label: "Warm Node",
      region: "us-east-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });
    const coldNode = await enrollNode(app, {
      organizationId: provider.organizationId,
      apiKey: providerApiKey,
      machineId: "resolve-provider-cold-0001",
      label: "Cold Node",
      region: "us-east-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });

    await upsertRoutingProfile(
      app,
      provider.organizationId,
      providerApiKey,
      warmNode.nodeId,
      8.5
    );
    await upsertRoutingProfile(
      app,
      provider.organizationId,
      providerApiKey,
      coldNode.nodeId,
      10
    );
    await recordBenchmark(
      app,
      provider.organizationId,
      providerApiKey,
      warmNode.nodeId,
      690
    );
    await recordBenchmark(
      app,
      provider.organizationId,
      providerApiKey,
      coldNode.nodeId,
      900
    );
    await updateRoutingState(
      app,
      provider.organizationId,
      providerApiKey,
      warmNode.nodeId
    );

    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyer.organizationId}/environments/production/placements/sync`,
      headers: { "x-api-key": buyerApiKey },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "us-east-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10,
        approvedModelAlias: "openai/gpt-oss-120b-like"
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = resolveSyncPlacementResponseSchema.parse(
      JSON.parse(response.body)
    );
    expect(payload.selection.providerNodeId).toBe(warmNode.nodeId);
    expect(payload.selection.warmCache.matched).toBe(true);
    expect(payload.selection.scoreBreakdown.warmCacheMultiplier).toBe(1.15);

    const logResult = await pool.query<{
      approved_model_alias: string | null;
      selected_provider_node_id: string | null;
      selection_score: number | null;
      price_performance_score: number | null;
      warm_cache_matched: boolean | null;
    }>(
      `
        SELECT
          approved_model_alias,
          selected_provider_node_id,
          selection_score,
          price_performance_score,
          warm_cache_matched
        FROM placement_decision_logs
        WHERE id = $1
      `,
      [payload.decisionLogId]
    );

    expect(logResult.rows[0]).toMatchObject({
      approved_model_alias: "openai/gpt-oss-120b-like",
      selected_provider_node_id: warmNode.nodeId,
      warm_cache_matched: true
    });
    expect(logResult.rows[0]?.selection_score).toBeGreaterThan(
      logResult.rows[0]?.price_performance_score ?? 0
    );

    await app.close();
  });
});

async function createOrganization(
  app: ReturnType<typeof buildApp>,
  input: {
    name: string;
    slug: string;
    founderEmail: string;
    founderDisplayName: string;
    accountCapabilities: string[];
  }
): Promise<{ organizationId: string; founderUserId: string }> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/organizations",
    payload: {
      name: input.name,
      slug: input.slug,
      founder: {
        email: input.founderEmail,
        displayName: input.founderDisplayName
      },
      accountCapabilities: input.accountCapabilities
    }
  });
  const payload = createOrganizationResponseSchema.parse(
    JSON.parse(response.body)
  );

  return {
    organizationId: payload.organization.id,
    founderUserId: payload.founder.userId
  };
}

async function issueApiKey(
  app: ReturnType<typeof buildApp>,
  organization: { organizationId: string; founderUserId: string },
  label: string
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: `/v1/organizations/${organization.organizationId}/api-keys`,
    payload: {
      actorUserId: organization.founderUserId,
      label,
      environment: "production"
    }
  });
  const payload = issueApiKeyResponseSchema.parse(JSON.parse(response.body));

  return payload.secret;
}

async function enrollNode(
  app: ReturnType<typeof buildApp>,
  input: {
    organizationId: string;
    apiKey: string;
    machineId: string;
    label: string;
    region: string;
    gpuModel: string;
    vramGb: number;
  }
): Promise<{ nodeId: string }> {
  const response = await app.inject({
    method: "POST",
    url: `/v1/organizations/${input.organizationId}/environments/production/provider-nodes`,
    headers: { "x-api-key": input.apiKey },
    payload: {
      machineId: input.machineId,
      label: input.label,
      runtime: "linux",
      region: input.region,
      hostname: `${input.machineId}.internal`,
      inventory: {
        driverVersion: "550.54.14",
        gpus: [
          {
            model: input.gpuModel,
            vramGb: input.vramGb,
            count: 4,
            interconnect: "nvlink"
          }
        ]
      }
    }
  });
  const payload = enrollProviderNodeResponseSchema.parse(
    JSON.parse(response.body)
  );

  return {
    nodeId: payload.node.id
  };
}

async function upsertRoutingProfile(
  app: ReturnType<typeof buildApp>,
  organizationId: string,
  apiKey: string,
  providerNodeId: string,
  priceFloorUsdPerHour: number
): Promise<void> {
  const response = await app.inject({
    method: "PUT",
    url: `/v1/organizations/${organizationId}/environments/production/provider-nodes/${providerNodeId}/routing-profile`,
    headers: { "x-api-key": apiKey },
    payload: {
      endpointUrl: `https://${providerNodeId}.example.com/v1/chat/completions`,
      priceFloorUsdPerHour
    }
  });

  expect(response.statusCode).toBe(200);
}

async function recordBenchmark(
  app: ReturnType<typeof buildApp>,
  organizationId: string,
  apiKey: string,
  providerNodeId: string,
  throughputTokensPerSecond: number
): Promise<void> {
  const response = await app.inject({
    method: "POST",
    url: `/v1/organizations/${organizationId}/environments/production/provider-nodes/${providerNodeId}/benchmarks`,
    headers: { "x-api-key": apiKey },
    payload: {
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond,
      driverVersion: "550.54.14"
    }
  });

  recordBenchmarkResponseSchema.parse(JSON.parse(response.body));
  expect(response.statusCode).toBe(201);
}

async function updateRoutingState(
  app: ReturnType<typeof buildApp>,
  organizationId: string,
  apiKey: string,
  providerNodeId: string
): Promise<void> {
  const response = await app.inject({
    method: "PUT",
    url: `/v1/organizations/${organizationId}/environments/production/provider-nodes/${providerNodeId}/routing-state`,
    headers: { "x-api-key": apiKey },
    payload: {
      warmModelAliases: [
        {
          approvedModelAlias: "openai/gpt-oss-120b-like",
          expiresAt: "2026-03-14T09:32:00.000Z"
        }
      ]
    }
  });

  expect(response.statusCode).toBe(200);
}
