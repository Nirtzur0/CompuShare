import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { z } from "zod";
import { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AuthenticateGatewayApiKeyUseCase } from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { ExecuteChatCompletionUseCase } from "../../../src/application/gateway/ExecuteChatCompletionUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../../src/application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../../src/application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import type {
  DispatchChatCompletionRequest,
  GatewayChatCompletionResponse,
  GatewayUpstreamClient
} from "../../../src/application/gateway/ports/GatewayUpstreamClient.js";
import { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
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

const forwardedWorkloadBundleSchema = z.object({
  modelManifestId: z.string(),
  customerOrganizationId: z.uuid(),
  networkPolicy: z.string()
});

class FakeGatewayUpstreamClient implements GatewayUpstreamClient {
  public readonly requests: DispatchChatCompletionRequest[] = [];

  public dispatchChatCompletion(
    request: DispatchChatCompletionRequest
  ): Promise<GatewayChatCompletionResponse> {
    this.requests.push(request);

    return Promise.resolve({
      id: "chatcmpl-123",
      object: "chat.completion",
      created: 1_772_001_200,
      model: request.request.model,
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: "Hello from the provider."
          }
        }
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 18,
        total_tokens: 30
      }
    });
  }
}

describe("POST /v1/chat/completions", () => {
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

  it("authenticates via bearer auth, resolves placement, rewrites the upstream model, and returns usage", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const fakeGatewayUpstreamClient = new FakeGatewayUpstreamClient();
    const approvedChatModelCatalog =
      InMemoryApprovedChatModelCatalog.createDefault();
    const workloadBundleSignatureService =
      new HmacWorkloadBundleSignatureService(
        "local-workload-signing-secret-1234567890",
        "local-hmac-v1"
      );
    let apiKeySequence = 0;
    const executeChatCompletionUseCase = new ExecuteChatCompletionUseCase(
      new AuthenticateGatewayApiKeyUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:30:00.000Z")
      ),
      approvedChatModelCatalog,
      new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:35:00.000Z")
      ),
      new PrepareSignedChatWorkloadBundleUseCase(
        workloadBundleSignatureService,
        new VerifySignedWorkloadBundleAdmissionUseCase(
          workloadBundleSignatureService,
          approvedChatModelCatalog,
          auditLog
        ),
        () => new Date("2026-03-15T08:37:00.000Z")
      ),
      fakeGatewayUpstreamClient,
      new RecordGatewayUsageMeterEventUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:39:00.000Z")
      ),
      auditLog,
      () => new Date("2026-03-15T08:40:00.000Z")
    );
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-15T08:00:00.000Z"),
          () => "unused-gateway-invitation-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-15T08:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-15T08:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-15T08:05:00.000Z"),
        () =>
          `csk_gateway_integration_secret_${String(apiKeySequence++).padStart(6, "0")}`
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-15T08:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:35:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:15:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-15T08:25:00.000Z")
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
          () => new Date("2026-03-15T08:20:00.000Z")
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
      executeChatCompletionUseCase
    });

    const buyer = await createOrganization(app, {
      name: "Gateway Buyer",
      slug: "gateway-buyer",
      founderEmail: "buyer-owner@example.com",
      founderDisplayName: "Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const buyerApiKey = await issueApiKey(app, buyer, "Gateway buyer key");

    const provider = await createOrganization(app, {
      name: "Gateway Provider",
      slug: "gateway-provider",
      founderEmail: "provider-owner@example.com",
      founderDisplayName: "Provider Owner",
      accountCapabilities: ["provider"]
    });
    const providerApiKey = await issueApiKey(app, provider, "Provider key");
    const providerNodeId = await enrollProviderNode(app, {
      organizationId: provider.organizationId,
      apiKey: providerApiKey,
      machineId: "gateway-provider-machine-0001",
      label: "Gateway Provider Node"
    });

    await app.inject({
      method: "PUT",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${providerNodeId}/routing-profile`,
      headers: { "x-api-key": providerApiKey },
      payload: {
        endpointUrl: "https://provider-gateway.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: `Bearer ${buyerApiKey}`
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [
          {
            role: "user",
            content: "Say hello."
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      model: "openai/gpt-oss-120b-like",
      usage: {
        prompt_tokens: 12,
        completion_tokens: 18,
        total_tokens: 30
      },
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello from the provider."
          }
        }
      ]
    });
    expect(fakeGatewayUpstreamClient.requests).toHaveLength(1);
    expect(fakeGatewayUpstreamClient.requests[0]?.endpointUrl).toBe(
      "https://provider-gateway.example.com/v1/chat/completions"
    );
    expect(fakeGatewayUpstreamClient.requests[0]?.request).toEqual({
      model: "gpt-oss-120b-instruct",
      messages: [
        {
          role: "user",
          content: "Say hello."
        }
      ]
    });
    expect(
      fakeGatewayUpstreamClient.requests[0]?.headers?.[
        "x-compushare-workload-bundle"
      ]
    ).toEqual(expect.any(String));
    expect(
      fakeGatewayUpstreamClient.requests[0]?.headers?.[
        "x-compushare-workload-signature"
      ]
    ).toEqual(expect.any(String));
    expect(
      fakeGatewayUpstreamClient.requests[0]?.headers?.[
        "x-compushare-workload-signature-key-id"
      ]
    ).toBe("local-hmac-v1");

    const forwardedBundle = forwardedWorkloadBundleSchema.parse(
      JSON.parse(
        Buffer.from(
          fakeGatewayUpstreamClient.requests[0]?.headers?.[
            "x-compushare-workload-bundle"
          ] ?? "",
          "base64url"
        ).toString("utf8")
      ) as unknown
    );

    expect(forwardedBundle).toMatchObject({
      modelManifestId: "chat-gpt-oss-120b-like-v1",
      customerOrganizationId: buyer.organizationId,
      networkPolicy: "provider-endpoint-only"
    });
    const meteringRows = await pool.query<{
      customer_organization_id: string;
      approved_model_alias: string;
      total_tokens: number;
      latency_ms: number;
    }>(
      `SELECT customer_organization_id, approved_model_alias, total_tokens, latency_ms
       FROM gateway_usage_meter_events`
    );

    expect(meteringRows.rows).toHaveLength(1);
    expect(meteringRows.rows[0]).toMatchObject({
      customer_organization_id: buyer.organizationId,
      approved_model_alias: "openai/gpt-oss-120b-like",
      total_tokens: 30
    });
    expect(meteringRows.rows[0]?.latency_ms).toEqual(expect.any(Number));

    await app.close();
  });
});

async function createOrganization(
  app: Awaited<ReturnType<typeof buildApp>>,
  input: {
    name: string;
    slug: string;
    founderEmail: string;
    founderDisplayName: string;
    accountCapabilities: readonly string[];
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
  app: Awaited<ReturnType<typeof buildApp>>,
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

async function enrollProviderNode(
  app: Awaited<ReturnType<typeof buildApp>>,
  input: {
    organizationId: string;
    apiKey: string;
    machineId: string;
    label: string;
  }
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: `/v1/organizations/${input.organizationId}/environments/production/provider-nodes`,
    headers: { "x-api-key": input.apiKey },
    payload: {
      machineId: input.machineId,
      label: input.label,
      runtime: "linux",
      region: "eu-central-1",
      hostname: "gateway-provider-01.internal",
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
  const payload = enrollProviderNodeResponseSchema.parse(
    JSON.parse(response.body)
  );

  return payload.node.id;
}
