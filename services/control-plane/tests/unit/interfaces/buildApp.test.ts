import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createRegistryResponse() {
  return {
    registry: {
      generatedAt: "2026-03-10T12:00:00.000Z",
      legalEntityName: "CompuShare, Inc.",
      privacyEmail: "privacy@example.com",
      securityEmail: "security@example.com",
      dpaEffectiveDate: "2026-03-10",
      dpaVersion: "2026.03",
      environment: null,
      platformSubprocessors: [],
      providerSubprocessors: [],
      providerAppendixStatus: "not_applicable" as const
    }
  };
}

function createDependencies(options: {
  includeOptional?: boolean;
  includeWebhook?: boolean;
  includeCompliance?: boolean;
  includeRisk?: boolean;
  includePrivateConnectors?: boolean;
}) {
  const dependencies = {
    createOrganizationUseCase: { execute: () => Promise.resolve({}) },
    issueOrganizationInvitationUseCase: { execute: () => Promise.resolve({}) },
    acceptOrganizationInvitationUseCase: { execute: () => Promise.resolve({}) },
    updateOrganizationMemberRoleUseCase: { execute: () => Promise.resolve({}) },
    issueOrganizationApiKeyUseCase: { execute: () => Promise.resolve({}) },
    authenticateOrganizationApiKeyUseCase: {
      execute: () => Promise.resolve({})
    },
    recordCustomerChargeUseCase: { execute: () => Promise.resolve({}) },
    recordCompletedJobSettlementUseCase: { execute: () => Promise.resolve({}) },
    getStagedPayoutExportUseCase: { execute: () => Promise.resolve({}) },
    getOrganizationWalletSummaryUseCase: { execute: () => Promise.resolve({}) },
    getConsumerDashboardOverviewUseCase: { execute: () => Promise.resolve({}) },
    getProviderDashboardOverviewUseCase: { execute: () => Promise.resolve({}) },
    executeChatCompletionUseCase: { execute: () => Promise.resolve({}) },
    listPlacementCandidatesUseCase: { execute: () => Promise.resolve({}) },
    resolveSyncPlacementUseCase: { execute: () => Promise.resolve({}) },
    enrollProviderNodeUseCase: { execute: () => Promise.resolve({}) },
    recordProviderBenchmarkUseCase: { execute: () => Promise.resolve({}) },
    listProviderInventoryUseCase: { execute: () => Promise.resolve({}) },
    getProviderNodeDetailUseCase: { execute: () => Promise.resolve({}) },
    issueProviderNodeAttestationChallengeUseCase: {
      execute: () => Promise.resolve({})
    },
    submitProviderNodeAttestationUseCase: {
      execute: () => Promise.resolve({})
    },
    upsertProviderNodeRoutingProfileUseCase: {
      execute: () => Promise.resolve({})
    },
    listProviderBenchmarkHistoryUseCase: { execute: () => Promise.resolve({}) },
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.resolve({})
    }
  };

  return {
    ...dependencies,
    ...(options.includeOptional === true
      ? {
          executeEmbeddingUseCase: { execute: () => Promise.resolve({}) },
          uploadGatewayFileUseCase: { execute: () => Promise.resolve({}) },
          getGatewayFileUseCase: { execute: () => Promise.resolve({}) },
          createGatewayBatchUseCase: { execute: () => Promise.resolve({}) },
          getGatewayBatchUseCase: { execute: () => Promise.resolve({}) },
          cancelGatewayBatchUseCase: { execute: () => Promise.resolve({}) },
          replaceProviderNodeRoutingStateUseCase: {
            execute: () => Promise.resolve({})
          }
        }
      : {}),
    ...(options.includeWebhook === true
      ? {
          processStripeConnectWebhookUseCase: {
            execute: () => Promise.resolve({})
          }
        }
      : {}),
    ...(options.includeCompliance === true
      ? {
          getSubprocessorRegistryUseCase: {
            execute: () => createRegistryResponse()
          },
          generateDpaExportUseCase: {
            execute: () =>
              Promise.resolve({
                fileName: "compushare-dpa.md",
                contentType: "text/markdown; charset=utf-8" as const,
                markdown: "# Export"
              })
          }
        }
      : {}),
    ...(options.includeRisk === true
      ? {
          getFraudReviewAlertsUseCase: {
            execute: () =>
              Promise.resolve({
                alerts: [],
                evaluatedAt: "2026-03-10T12:00:00.000Z",
                lookbackDays: 30
              })
          }
        }
      : {}),
    ...(options.includePrivateConnectors === true
      ? {
          createPrivateConnectorUseCase: {
            execute: () =>
              Promise.resolve({
                connector: {
                  id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0"
                }
              })
          },
          listPrivateConnectorsUseCase: {
            execute: () =>
              Promise.resolve({
                connectors: []
              })
          },
          recordPrivateConnectorCheckInUseCase: {
            execute: () => Promise.resolve({})
          },
          admitPrivateConnectorExecutionGrantUseCase: {
            execute: () => Promise.resolve({})
          }
        }
      : {})
  } as unknown as Parameters<typeof buildApp>[0];
}

describe("buildApp", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("omits optional embeddings, file, batch, and routing-state routes when those use cases are missing", async () => {
    const app = buildApp(createDependencies({ includeOptional: false }));
    apps.push(app);

    const embeddingResponse = await app.inject({
      method: "POST",
      url: "/v1/embeddings",
      payload: {}
    });
    const fileResponse = await app.inject({
      method: "POST",
      url: "/v1/files"
    });
    const batchResponse = await app.inject({
      method: "POST",
      url: "/v1/batches",
      payload: {}
    });
    const routingStateResponse = await app.inject({
      method: "PUT",
      url: "/v1/organizations/032b2d20-90a3-4e47-8031-d3f8fc9fcdb3/environments/development/provider-nodes/5b667085-505d-4fba-8872-fcaa85b7c77b/routing-state",
      payload: {}
    });

    expect(embeddingResponse.statusCode).toBe(404);
    expect(fileResponse.statusCode).toBe(404);
    expect(batchResponse.statusCode).toBe(404);
    expect(routingStateResponse.statusCode).toBe(404);
  });

  it("registers optional embeddings, file, batch, and routing-state routes when their use cases are provided", async () => {
    const app = buildApp(createDependencies({ includeOptional: true }));
    apps.push(app);

    const embeddingResponse = await app.inject({
      method: "POST",
      url: "/v1/embeddings",
      payload: {}
    });
    const fileResponse = await app.inject({
      method: "POST",
      url: "/v1/files"
    });
    const batchResponse = await app.inject({
      method: "POST",
      url: "/v1/batches",
      payload: {}
    });
    const routingStateResponse = await app.inject({
      method: "PUT",
      url: "/v1/organizations/032b2d20-90a3-4e47-8031-d3f8fc9fcdb3/environments/development/provider-nodes/5b667085-505d-4fba-8872-fcaa85b7c77b/routing-state",
      payload: {}
    });

    expect(embeddingResponse.statusCode).not.toBe(404);
    expect(fileResponse.statusCode).not.toBe(404);
    expect(batchResponse.statusCode).not.toBe(404);
    expect(routingStateResponse.statusCode).not.toBe(404);
  });

  it("omits optional webhook, compliance, risk, and private connector routes when those use cases are missing", async () => {
    const app = buildApp(
      createDependencies({
        includeWebhook: false,
        includeCompliance: false,
        includeRisk: false,
        includePrivateConnectors: false
      })
    );
    apps.push(app);

    const webhookResponse = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      payload: {}
    });
    const complianceResponse = await app.inject({
      method: "GET",
      url: "/v1/compliance/subprocessors"
    });
    const riskResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/032b2d20-90a3-4e47-8031-d3f8fc9fcdb3/risk/fraud-review-alerts?actorUserId=5b667085-505d-4fba-8872-fcaa85b7c77b"
    });
    const privateConnectorResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/032b2d20-90a3-4e47-8031-d3f8fc9fcdb3/private-connectors?actorUserId=5b667085-505d-4fba-8872-fcaa85b7c77b"
    });

    expect(webhookResponse.statusCode).toBe(404);
    expect(complianceResponse.statusCode).toBe(404);
    expect(riskResponse.statusCode).toBe(404);
    expect(privateConnectorResponse.statusCode).toBe(404);
  });

  it("registers optional webhook, compliance, risk, and private connector routes when their use cases are provided", async () => {
    const app = buildApp(
      createDependencies({
        includeWebhook: true,
        includeCompliance: true,
        includeRisk: true,
        includePrivateConnectors: true
      })
    );
    apps.push(app);

    const webhookResponse = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      payload: {}
    });
    const complianceResponse = await app.inject({
      method: "GET",
      url: "/v1/compliance/subprocessors"
    });
    const riskResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/032b2d20-90a3-4e47-8031-d3f8fc9fcdb3/risk/fraud-review-alerts?actorUserId=5b667085-505d-4fba-8872-fcaa85b7c77b"
    });
    const privateConnectorResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/032b2d20-90a3-4e47-8031-d3f8fc9fcdb3/private-connectors?actorUserId=5b667085-505d-4fba-8872-fcaa85b7c77b"
    });

    expect(webhookResponse.statusCode).not.toBe(404);
    expect(complianceResponse.statusCode).toBe(200);
    expect(riskResponse.statusCode).toBe(200);
    expect(privateConnectorResponse.statusCode).toBe(200);
  });
});
