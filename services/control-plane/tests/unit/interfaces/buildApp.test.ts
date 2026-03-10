import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createDependencies(includeOptional: boolean) {
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

  if (!includeOptional) {
    return dependencies as unknown as Parameters<typeof buildApp>[0];
  }

  return {
    ...dependencies,
    executeEmbeddingUseCase: { execute: () => Promise.resolve({}) },
    uploadGatewayFileUseCase: { execute: () => Promise.resolve({}) },
    getGatewayFileUseCase: { execute: () => Promise.resolve({}) },
    createGatewayBatchUseCase: { execute: () => Promise.resolve({}) },
    getGatewayBatchUseCase: { execute: () => Promise.resolve({}) },
    cancelGatewayBatchUseCase: { execute: () => Promise.resolve({}) },
    replaceProviderNodeRoutingStateUseCase: {
      execute: () => Promise.resolve({})
    }
  } as unknown as Parameters<typeof buildApp>[0];
}

describe("buildApp", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("omits optional embeddings, file, batch, and routing-state routes when those use cases are missing", async () => {
    const app = buildApp(createDependencies(false));
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
    const app = buildApp(createDependencies(true));
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
});
