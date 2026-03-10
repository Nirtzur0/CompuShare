import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance, type InjectOptions } from "fastify";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { SeedRunnableAlphaDemo } from "../../../src/application/demo/SeedRunnableAlphaDemo.js";
import { GetConsumerDashboardOverviewUseCase } from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { ExecuteChatCompletionUseCase } from "../../../src/application/gateway/ExecuteChatCompletionUseCase.js";
import { AuthenticateGatewayApiKeyUseCase } from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../../src/application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { CreatePrivateConnectorUseCase } from "../../../src/application/privateConnector/CreatePrivateConnectorUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { ReplaceProviderNodeRoutingStateUseCase } from "../../../src/application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../../src/application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { PlacementScoringPolicy } from "../../../src/config/PlacementScoringPolicy.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { FetchGatewayUpstreamClient } from "../../../src/infrastructure/gateway/FetchGatewayUpstreamClient.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { PostgresPrivateConnectorRepository } from "../../../src/infrastructure/persistence/postgres/PostgresPrivateConnectorRepository.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

interface PgMemModule {
  Pool: new () => Pool;
}

describe("local gateway demo route", () => {
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

  it("routes a seeded buyer request through the real gateway fetch path", async () => {
    let upstreamRequestUrl = "";
    let upstreamAuthorizationBundle = "";
    const providerRuntimeApp: FastifyInstance = Fastify();

    providerRuntimeApp.post("/v1/chat/completions", (request) => {
      upstreamRequestUrl = request.url;
      upstreamAuthorizationBundle = String(
        request.headers["x-compushare-workload-bundle"] ?? ""
      );

      return {
        id: "chatcmpl-local-gateway-demo",
        object: "chat.completion",
        created: 1_773_624_000,
        model: "gpt-oss-120b-instruct",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: "Hello from the local provider runtime."
            }
          }
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 18,
          total_tokens: 30
        }
      };
    });

    const clock = () => new Date("2026-03-17T09:00:00.000Z");
    const repository = new PostgresIdentityRepository(pool, clock);
    const privateConnectorRepository = new PostgresPrivateConnectorRepository(
      pool
    );
    const auditLog = new StructuredConsoleAuditLog();
    const approvedChatModelCatalog =
      InMemoryApprovedChatModelCatalog.createDefault();
    const placementScoringPolicy = PlacementScoringPolicy.createDefault();
    const workloadBundleSignatureService =
      new HmacWorkloadBundleSignatureService(
        "local-workload-signing-secret-1234567890",
        "local-hmac-v1"
      );
    let apiKeySequence = 0;
    const seedUseCase = new SeedRunnableAlphaDemo(
      new CreateOrganizationUseCase(repository, auditLog, clock),
      new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        clock,
        () =>
          apiKeySequence++ === 1
            ? "csk_provider_runtime_local_seed_secret_000000"
            : "csk_gateway_demo_buyer_secret_000000"
      ),
      new EnrollProviderNodeUseCase(repository, auditLog, clock),
      new RecordProviderBenchmarkUseCase(repository, auditLog, clock),
      new ReplaceProviderNodeRoutingStateUseCase(
        repository,
        approvedChatModelCatalog,
        placementScoringPolicy,
        auditLog,
        clock
      ),
      new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog, clock),
      new RecordCustomerChargeUseCase(repository, auditLog, clock),
      new RecordCompletedJobSettlementUseCase(repository, auditLog, clock),
      new CreatePrivateConnectorUseCase(
        privateConnectorRepository,
        auditLog,
        clock
      ),
      new ResolveSyncPlacementUseCase(repository, auditLog, clock),
      new RecordGatewayUsageMeterEventUseCase(repository, auditLog, clock),
      new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      new GetProviderDashboardOverviewUseCase(repository, auditLog),
      clock
    );
    const seededDemo = await seedUseCase.execute({
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeBaseUrl: "http://localhost:3200",
      dashboardBaseUrl: "http://127.0.0.1:3000",
      seedTag: "gateway-demo"
    });
    const verifySignedWorkloadBundleAdmissionUseCase =
      new VerifySignedWorkloadBundleAdmissionUseCase(
        workloadBundleSignatureService,
        approvedChatModelCatalog,
        auditLog,
        () => new Date("2026-03-17T09:05:00.000Z")
      );
    const executeChatCompletionUseCase = new ExecuteChatCompletionUseCase(
      new AuthenticateGatewayApiKeyUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-17T09:02:00.000Z")
      ),
      approvedChatModelCatalog,
      new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-17T09:03:00.000Z")
      ),
      new PrepareSignedChatWorkloadBundleUseCase(
        workloadBundleSignatureService,
        verifySignedWorkloadBundleAdmissionUseCase,
        () => new Date("2026-03-17T09:04:00.000Z")
      ),
      new FetchGatewayUpstreamClient(async (input, init) => {
        const url =
          typeof input === "string"
            ? new URL(input)
            : input instanceof URL
              ? input
              : new URL(input.url);
        const headers = Object.fromEntries(
          new Headers(init?.headers).entries()
        ) as Record<string, string>;
        const payload = typeof init?.body === "string" ? init.body : undefined;
        const injectOptions: InjectOptions = {
          method: "POST",
          url: `${url.pathname}${url.search}`,
          headers
        };

        if (payload !== undefined) {
          injectOptions.payload = payload;
        }

        const response = await providerRuntimeApp.inject(injectOptions);

        return new Response(response.body, {
          status: response.statusCode,
          headers: response.headers as unknown as HeadersInit
        });
      }),
      new RecordGatewayUsageMeterEventUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-17T09:05:30.000Z")
      ),
      auditLog,
      () => new Date("2026-03-17T09:06:00.000Z")
    );
    try {
      const app = buildApp({
        createOrganizationUseCase: {
          execute: () =>
            Promise.reject(new Error("unused create organization path"))
        },
        issueOrganizationInvitationUseCase: {
          execute: () => Promise.reject(new Error("unused invitation path"))
        },
        acceptOrganizationInvitationUseCase: {
          execute: () =>
            Promise.reject(new Error("unused invitation accept path"))
        },
        updateOrganizationMemberRoleUseCase: {
          execute: () => Promise.reject(new Error("unused role mutation path"))
        },
        issueOrganizationApiKeyUseCase: {
          execute: () => Promise.reject(new Error("unused api key issue path"))
        },
        authenticateOrganizationApiKeyUseCase: {
          execute: () => Promise.reject(new Error("unused api key auth path"))
        },
        recordCustomerChargeUseCase: {
          execute: () => Promise.reject(new Error("unused finance charge path"))
        },
        recordCompletedJobSettlementUseCase: {
          execute: () =>
            Promise.reject(new Error("unused finance settlement path"))
        },
        getStagedPayoutExportUseCase: {
          execute: () => Promise.reject(new Error("unused payout export path"))
        },
        getOrganizationWalletSummaryUseCase: {
          execute: () => Promise.reject(new Error("unused wallet path"))
        },
        getConsumerDashboardOverviewUseCase: {
          execute: () =>
            Promise.reject(new Error("unused consumer dashboard path"))
        },
        getProviderDashboardOverviewUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider dashboard path"))
        },
        executeChatCompletionUseCase,
        listPlacementCandidatesUseCase: {
          execute: () => Promise.reject(new Error("unused placement path"))
        },
        resolveSyncPlacementUseCase: {
          execute: () =>
            Promise.reject(new Error("unused sync placement resolution path"))
        },
        enrollProviderNodeUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider enrollment path"))
        },
        recordProviderBenchmarkUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider benchmark path"))
        },
        listProviderInventoryUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider inventory path"))
        },
        getProviderNodeDetailUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider node detail path"))
        },
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
        upsertProviderNodeRoutingProfileUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider routing profile path"))
        },
        listProviderBenchmarkHistoryUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider benchmark history path"))
        },
        admitProviderRuntimeWorkloadBundleUseCase: {
          execute: () =>
            Promise.reject(new Error("unused provider runtime admission path"))
        }
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/chat/completions",
        headers: {
          authorization: `Bearer ${seededDemo.buyer.apiKey.secret}`
        },
        payload: {
          model: "openai/gpt-oss-120b-like",
          messages: [
            { role: "user", content: "Hello from the local gateway demo" }
          ]
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        model: "openai/gpt-oss-120b-like",
        usage: {
          total_tokens: 30
        },
        choices: [
          {
            message: {
              content: "Hello from the local provider runtime."
            }
          }
        ]
      });
      expect(upstreamRequestUrl).toContain("/v1/chat/completions?");
      expect(upstreamRequestUrl).toContain(
        `organizationId=${seededDemo.provider.organizationId}`
      );
      expect(upstreamRequestUrl).toContain(
        `providerNodeId=${seededDemo.provider.node.id}`
      );
      expect(upstreamAuthorizationBundle.length).toBeGreaterThan(0);
    } finally {
      await providerRuntimeApp.close();
    }
  });
});
