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
import { AdmitProviderRuntimeWorkloadBundleUseCase } from "../../../src/application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../../src/application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";
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

describe("provider runtime admission route", () => {
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

  it("admits a valid signed workload bundle for an enrolled provider node", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const approvedChatModelCatalog =
      InMemoryApprovedChatModelCatalog.createDefault();
    const workloadBundleSignatureService =
      new HmacWorkloadBundleSignatureService(
        "local-workload-signing-secret-1234567890",
        "local-hmac-v1"
      );
    const verifySignedWorkloadBundleAdmissionUseCase =
      new VerifySignedWorkloadBundleAdmissionUseCase(
        workloadBundleSignatureService,
        approvedChatModelCatalog,
        auditLog,
        () => new Date("2026-03-16T10:05:00.000Z")
      );
    const prepareSignedChatWorkloadBundleUseCase =
      new PrepareSignedChatWorkloadBundleUseCase(
        workloadBundleSignatureService,
        verifySignedWorkloadBundleAdmissionUseCase,
        () => new Date("2026-03-16T10:00:00.000Z")
      );
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T09:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T09:00:00.000Z"),
          () => "unused-provider-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T09:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T09:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-16T09:05:00.000Z"),
        () => "csk_provider_runtime_secret_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T09:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T09:15:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T09:20:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T09:25:00.000Z")
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
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog),
      listProviderBenchmarkHistoryUseCase:
        new ListProviderBenchmarkHistoryUseCase(repository),
      admitProviderRuntimeWorkloadBundleUseCase:
        new AdmitProviderRuntimeWorkloadBundleUseCase(
          new GetProviderNodeDetailUseCase(repository),
          verifySignedWorkloadBundleAdmissionUseCase
        ),
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
        execute: () => Promise.reject(new Error("unused gateway path"))
      }
    });

    const createBuyerResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        name: "Buyer Org",
        slug: "buyer-org",
        founder: {
          email: "buyer-owner@example.com",
          displayName: "Buyer Owner"
        },
        accountCapabilities: ["buyer"]
      }
    });
    const buyerPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createBuyerResponse.body)
    );

    const createProviderResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        name: "Provider Org",
        slug: "provider-org",
        founder: {
          email: "provider-owner@example.com",
          displayName: "Provider Owner"
        },
        accountCapabilities: ["provider"]
      }
    });
    const providerPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createProviderResponse.body)
    );

    const issueApiKeyResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${providerPayload.organization.id}/api-keys`,
      payload: {
        actorUserId: providerPayload.founder.userId,
        label: "Provider runtime key",
        environment: "production"
      }
    });
    const apiKeyPayload = issueApiKeyResponseSchema.parse(
      JSON.parse(issueApiKeyResponse.body)
    );

    const enrollResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${providerPayload.organization.id}/environments/production/provider-nodes`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [
            {
              model: "NVIDIA A100",
              vramGb: 80,
              count: 4,
              interconnect: "nvlink"
            }
          ]
        }
      }
    });
    const providerNodePayload = enrollProviderNodeResponseSchema.parse(
      JSON.parse(enrollResponse.body)
    );

    const manifest = approvedChatModelCatalog.findByAlias(
      "openai/gpt-oss-120b-like"
    );

    if (manifest === null) {
      throw new Error("Expected approved chat manifest to exist.");
    }

    const signedBundle = await prepareSignedChatWorkloadBundleUseCase.execute({
      actorUserId: buyerPayload.founder.userId,
      customerOrganizationId: buyerPayload.organization.id,
      environment: "production",
      manifest,
      providerNodeId: providerNodePayload.node.id,
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${providerPayload.organization.id}/environments/production/provider-nodes/${providerNodePayload.node.id}/runtime-admissions`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      },
      payload: {
        expectedCustomerOrganizationId: buyerPayload.organization.id,
        signedBundle: signedBundle.toSnapshot()
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      admission: {
        admitted: true,
        bundleId: signedBundle.bundle.id,
        manifestId: manifest.manifestId,
        customerOrganizationId: buyerPayload.organization.id,
        providerNodeId: providerNodePayload.node.id
      }
    });
  });

  it("rejects signed workload bundles when the expected customer scope mismatches", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const approvedChatModelCatalog =
      InMemoryApprovedChatModelCatalog.createDefault();
    const workloadBundleSignatureService =
      new HmacWorkloadBundleSignatureService(
        "local-workload-signing-secret-1234567890",
        "local-hmac-v1"
      );
    const verifySignedWorkloadBundleAdmissionUseCase =
      new VerifySignedWorkloadBundleAdmissionUseCase(
        workloadBundleSignatureService,
        approvedChatModelCatalog,
        auditLog,
        () => new Date("2026-03-16T11:05:00.000Z")
      );
    const prepareSignedChatWorkloadBundleUseCase =
      new PrepareSignedChatWorkloadBundleUseCase(
        workloadBundleSignatureService,
        verifySignedWorkloadBundleAdmissionUseCase,
        () => new Date("2026-03-16T11:00:00.000Z")
      );
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T10:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T10:00:00.000Z"),
          () => "unused-provider-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T10:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T10:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-16T10:05:00.000Z"),
        () => "csk_provider_runtime_secret_mismatch_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-16T10:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T10:15:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T10:20:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-16T10:25:00.000Z")
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
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog),
      listProviderBenchmarkHistoryUseCase:
        new ListProviderBenchmarkHistoryUseCase(repository),
      admitProviderRuntimeWorkloadBundleUseCase:
        new AdmitProviderRuntimeWorkloadBundleUseCase(
          new GetProviderNodeDetailUseCase(repository),
          verifySignedWorkloadBundleAdmissionUseCase
        ),
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
        execute: () => Promise.reject(new Error("unused gateway path"))
      }
    });

    const createBuyerResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        name: "Mismatch Buyer Org",
        slug: "mismatch-buyer-org",
        founder: {
          email: "buyer-owner-2@example.com",
          displayName: "Buyer Owner 2"
        },
        accountCapabilities: ["buyer"]
      }
    });
    const buyerPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createBuyerResponse.body)
    );

    const createProviderResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        name: "Mismatch Provider Org",
        slug: "mismatch-provider-org",
        founder: {
          email: "provider-owner-2@example.com",
          displayName: "Provider Owner 2"
        },
        accountCapabilities: ["provider"]
      }
    });
    const providerPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createProviderResponse.body)
    );

    const issueApiKeyResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${providerPayload.organization.id}/api-keys`,
      payload: {
        actorUserId: providerPayload.founder.userId,
        label: "Provider runtime key",
        environment: "production"
      }
    });
    const apiKeyPayload = issueApiKeyResponseSchema.parse(
      JSON.parse(issueApiKeyResponse.body)
    );

    const enrollResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${providerPayload.organization.id}/environments/production/provider-nodes`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      },
      payload: {
        machineId: "node-machine-0002",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-02.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [
            {
              model: "NVIDIA A100",
              vramGb: 80,
              count: 4,
              interconnect: "nvlink"
            }
          ]
        }
      }
    });
    const providerNodePayload = enrollProviderNodeResponseSchema.parse(
      JSON.parse(enrollResponse.body)
    );

    const manifest = approvedChatModelCatalog.findByAlias(
      "openai/gpt-oss-120b-like"
    );

    if (manifest === null) {
      throw new Error("Expected approved chat manifest to exist.");
    }

    const signedBundle = await prepareSignedChatWorkloadBundleUseCase.execute({
      actorUserId: buyerPayload.founder.userId,
      customerOrganizationId: buyerPayload.organization.id,
      environment: "production",
      manifest,
      providerNodeId: providerNodePayload.node.id,
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${providerPayload.organization.id}/environments/production/provider-nodes/${providerNodePayload.node.id}/runtime-admissions`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      },
      payload: {
        expectedCustomerOrganizationId: "11111111-1111-4111-8111-111111111111",
        signedBundle: signedBundle.toSnapshot()
      }
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "WORKLOAD_BUNDLE_ADMISSION_REJECTED",
      message: "customer_organization_mismatch"
    });
  });
});
