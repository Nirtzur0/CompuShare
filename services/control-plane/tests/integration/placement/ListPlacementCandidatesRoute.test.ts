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
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
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
  apiKey: z.object({
    id: z.uuid(),
    organizationId: z.uuid(),
    label: z.string(),
    environment: z.enum(["development", "staging", "production"]),
    secretPrefix: z.string(),
    issuedByUserId: z.uuid(),
    createdAt: z.iso.datetime()
  }),
  secret: z.string()
});

const enrollProviderNodeResponseSchema = z.object({
  node: z.object({
    id: z.uuid()
  })
});

const placementPreviewResponseSchema = z.object({
  candidates: z.array(
    z.object({
      providerNodeId: z.uuid(),
      providerOrganizationId: z.uuid(),
      providerNodeLabel: z.string(),
      region: z.string(),
      trustTier: z.enum(["t0_community", "t1_vetted", "t2_attested"]),
      priceFloorUsdPerHour: z.number(),
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
  )
});

describe("placement candidate route", () => {
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

  it("returns only matching candidates in deterministic order", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    let apiKeySequence = 0;
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-13T08:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-13T08:00:00.000Z"),
          () => "unused-placement-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-13T08:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-13T08:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-13T08:05:00.000Z"),
        () =>
          `csk_placement_secret_${String(apiKeySequence++).padStart(6, "0")}`
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-13T08:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-13T08:10:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-13T08:15:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-13T08:25:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-13T08:20:00.000Z")
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
      name: "Acme Buyer",
      slug: "acme-buyer",
      founderEmail: "buyer-owner@example.com",
      founderDisplayName: "Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const buyerApiKey = await issueApiKey(app, buyer, "Buyer preview key");

    const firstProvider = await createOrganization(app, {
      name: "Provider Alpha",
      slug: "provider-alpha",
      founderEmail: "provider-alpha@example.com",
      founderDisplayName: "Provider Alpha Owner",
      accountCapabilities: ["provider"]
    });
    const secondProvider = await createOrganization(app, {
      name: "Provider Beta",
      slug: "provider-beta",
      founderEmail: "provider-beta@example.com",
      founderDisplayName: "Provider Beta Owner",
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
      machineId: "provider-alpha-expensive-0001",
      label: "Expensive Match",
      region: "eu-central-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });
    const matchedNodeB = await enrollNode(app, {
      organizationId: secondProvider.organizationId,
      apiKey: secondProviderApiKey,
      machineId: "provider-beta-match-0001",
      label: "Beta Match",
      region: "eu-central-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });
    const unmatchedRegionNode = await enrollNode(app, {
      organizationId: firstProvider.organizationId,
      apiKey: firstProviderApiKey,
      machineId: "provider-alpha-us-0001",
      label: "US Region Node",
      region: "us-east-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });
    const matchedNodeA = await enrollNode(app, {
      organizationId: firstProvider.organizationId,
      apiKey: firstProviderApiKey,
      machineId: "provider-alpha-match-0001",
      label: "Alpha Match",
      region: "eu-central-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });
    const noRoutingNode = await enrollNode(app, {
      organizationId: secondProvider.organizationId,
      apiKey: secondProviderApiKey,
      machineId: "provider-beta-missing-routing-0001",
      label: "Missing Routing",
      region: "eu-central-1",
      gpuModel: "NVIDIA A100",
      vramGb: 80
    });

    await upsertRoutingProfile(
      app,
      firstProvider.organizationId,
      firstProviderApiKey,
      expensiveNode.nodeId,
      12.5
    );
    await upsertRoutingProfile(
      app,
      secondProvider.organizationId,
      secondProviderApiKey,
      matchedNodeB.nodeId,
      6.25
    );
    await upsertRoutingProfile(
      app,
      firstProvider.organizationId,
      firstProviderApiKey,
      unmatchedRegionNode.nodeId,
      4.5
    );
    await upsertRoutingProfile(
      app,
      firstProvider.organizationId,
      firstProviderApiKey,
      matchedNodeA.nodeId,
      5.75
    );

    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyer.organizationId}/environments/production/placement-candidates/preview`,
      headers: { "x-api-key": buyerApiKey },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 8
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = placementPreviewResponseSchema.parse(
      JSON.parse(response.body)
    );
    expect(payload.candidates).toHaveLength(2);
    expect(
      payload.candidates.map(
        (candidate: { providerNodeId: string }) => candidate.providerNodeId
      )
    ).toEqual(
      [matchedNodeA.nodeId, matchedNodeB.nodeId].sort((left, right) =>
        left.localeCompare(right)
      )
    );
    for (const candidate of payload.candidates) {
      expect(candidate.region).toBe("eu-central-1");
      expect(candidate.trustTier).toBe("t1_vetted");
      expect(candidate.matchedGpu.model).toBe("NVIDIA A100");
      expect(candidate.matchedGpu.vramGb).toBe(80);
    }
    expect(
      payload.candidates.some(
        (candidate: { providerNodeId: string }) =>
          candidate.providerNodeId === expensiveNode.nodeId
      )
    ).toBe(false);
    expect(
      payload.candidates.some(
        (candidate: { providerNodeId: string }) =>
          candidate.providerNodeId === unmatchedRegionNode.nodeId
      )
    ).toBe(false);
    expect(
      payload.candidates.some(
        (candidate: { providerNodeId: string }) =>
          candidate.providerNodeId === noRoutingNode.nodeId
      )
    ).toBe(false);

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
