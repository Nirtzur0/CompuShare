import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { SeedRunnableAlphaDemo } from "../../../src/application/demo/SeedRunnableAlphaDemo.js";
import { GetConsumerDashboardOverviewUseCase } from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../../src/application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

interface PgMemModule {
  Pool: new () => Pool;
}

describe("SeedRunnableAlphaDemo", () => {
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

  it("seeds demo data that can be queried through the dashboard routes", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    let apiKeySequence = 0;
    const clock = () => new Date("2026-03-09T12:00:00.000Z");
    const seedUseCase = new SeedRunnableAlphaDemo(
      new CreateOrganizationUseCase(repository, auditLog, clock),
      new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        clock,
        () =>
          `csk_demo_seed_secret_${String(apiKeySequence++).padStart(6, "0")}`
      ),
      new EnrollProviderNodeUseCase(repository, auditLog, clock),
      new RecordProviderBenchmarkUseCase(repository, auditLog, clock),
      new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog, clock),
      new RecordCustomerChargeUseCase(repository, auditLog, clock),
      new RecordCompletedJobSettlementUseCase(repository, auditLog, clock),
      new ResolveSyncPlacementUseCase(repository, auditLog, clock),
      new RecordGatewayUsageMeterEventUseCase(repository, auditLog, clock),
      new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      new GetProviderDashboardOverviewUseCase(repository, auditLog),
      clock
    );

    const result = await seedUseCase.execute({
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeBaseUrl: "http://127.0.0.1:3200",
      dashboardBaseUrl: "http://127.0.0.1:3000",
      seedTag: "alpha-demo"
    });

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
      getConsumerDashboardOverviewUseCase:
        new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      getProviderDashboardOverviewUseCase:
        new GetProviderDashboardOverviewUseCase(repository, auditLog),
      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway path"))
      },
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

    const providerResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${result.provider.organizationId}/dashboard/provider-overview?actorUserId=${result.provider.actorUserId}`
    });
    const consumerResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${result.buyer.organizationId}/dashboard/consumer-overview?actorUserId=${result.buyer.actorUserId}`
    });

    expect(result.buyer.dashboardUrl).toContain("/consumer?");
    expect(result.provider.dashboardUrl).toContain("/provider?");
    expect(result.buyer.apiKey.secret).toContain("csk_demo_seed_secret");
    expect(result.provider.apiKey.secret).toContain("csk_demo_seed_secret");
    expect(result.provider.routingProfile.endpointUrl).toContain(
      "http://127.0.0.1:3200/v1/chat/completions?"
    );
    expect(result.gatewayDemo.curlCommand).toContain("Authorization: Bearer");
    expect(providerResponse.statusCode).toBe(200);
    expect(providerResponse.json()).toMatchObject({
      overview: {
        activeNodeCount: 1,
        balances: {
          pendingEarningsUsd: "42.00",
          withdrawableCashUsd: "40.00"
        }
      }
    });
    const providerOverviewPayload: {
      overview: {
        earningsTrend: { earningsUsd: string }[];
        estimatedUtilizationTrend: { totalTokens: number }[];
      };
    } = providerResponse.json();

    expect(
      providerOverviewPayload.overview.earningsTrend.some(
        (point) => point.earningsUsd === "12.00"
      )
    ).toBe(true);
    expect(
      providerOverviewPayload.overview.estimatedUtilizationTrend.some(
        (point) => point.totalTokens > 0
      )
    ).toBe(true);
    expect(consumerResponse.statusCode).toBe(200);
    expect(consumerResponse.json()).toMatchObject({
      overview: {
        spendSummary: {
          lifetimeFundedUsd: "100.00",
          lifetimeSettledSpendUsd: "50.00"
        },
        balances: {
          usageBalanceUsd: "50.00"
        }
      }
    });
    const consumerOverviewPayload: {
      overview: {
        usageTrend: { requestCount: number }[];
        latencyByModel: { modelAlias: string }[];
      };
    } = consumerResponse.json();

    expect(
      consumerOverviewPayload.overview.usageTrend.some(
        (point) => point.requestCount === 1
      )
    ).toBe(true);
    expect(
      consumerOverviewPayload.overview.latencyByModel.some(
        (point) => point.modelAlias === "openai/gpt-oss-120b-like"
      )
    ).toBe(true);
  });

  it("rejects seed tags that normalize to fewer than four characters", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const seedUseCase = new SeedRunnableAlphaDemo(
      new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T12:00:00.000Z")
      ),
      new IssueOrganizationApiKeyUseCase(repository, repository, auditLog),
      new EnrollProviderNodeUseCase(repository, auditLog),
      new RecordProviderBenchmarkUseCase(repository, auditLog),
      new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog),
      new RecordCustomerChargeUseCase(repository, auditLog),
      new RecordCompletedJobSettlementUseCase(repository, auditLog),
      new ResolveSyncPlacementUseCase(repository, auditLog),
      new RecordGatewayUsageMeterEventUseCase(repository, auditLog),
      new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      new GetProviderDashboardOverviewUseCase(repository, auditLog)
    );

    await expect(
      seedUseCase.execute({
        controlPlaneBaseUrl: "http://127.0.0.1:3100",
        providerRuntimeBaseUrl: "http://127.0.0.1:3200",
        dashboardBaseUrl: "http://127.0.0.1:3000",
        seedTag: "!!!"
      })
    ).rejects.toThrow("Seed tag must normalize to at least 4 characters.");
  });

  it("derives a stable default seed tag from the clock when one is not provided", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    let apiKeySequence = 0;
    const clock = () => new Date("2026-03-09T14:00:00.000Z");
    const seedUseCase = new SeedRunnableAlphaDemo(
      new CreateOrganizationUseCase(repository, auditLog, clock),
      new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        clock,
        () =>
          `csk_demo_default_secret_${String(apiKeySequence++).padStart(6, "0")}`
      ),
      new EnrollProviderNodeUseCase(repository, auditLog, clock),
      new RecordProviderBenchmarkUseCase(repository, auditLog, clock),
      new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog, clock),
      new RecordCustomerChargeUseCase(repository, auditLog, clock),
      new RecordCompletedJobSettlementUseCase(repository, auditLog, clock),
      new ResolveSyncPlacementUseCase(repository, auditLog, clock),
      new RecordGatewayUsageMeterEventUseCase(repository, auditLog, clock),
      new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      new GetProviderDashboardOverviewUseCase(repository, auditLog),
      clock
    );

    const result = await seedUseCase.execute({
      controlPlaneBaseUrl: "http://127.0.0.1:3100",
      providerRuntimeBaseUrl: "http://127.0.0.1:3200",
      dashboardBaseUrl: "http://127.0.0.1:3000"
    });

    expect(result.seedTag).toBe("2026-03-09t14-00-00-000z");
    expect(result.buyer.organizationSlug).toBe(
      "demo-buyer-2026-03-09t14-00-00-000z"
    );
  });
});
