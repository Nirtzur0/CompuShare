import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { GatewayApiKeyAuthenticationError } from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import {
  ApprovedEmbeddingModelNotFoundError,
  type ExecuteEmbeddingUseCase
} from "../../../src/application/gateway/ExecuteEmbeddingUseCase.js";
import {
  ApprovedChatModelNotFoundError,
  type ExecuteChatCompletionUseCase,
  GatewayAuthorizationHeaderError
} from "../../../src/application/gateway/ExecuteChatCompletionUseCase.js";
import {
  GatewayUpstreamRequestError,
  GatewayUpstreamResponseError
} from "../../../src/application/gateway/ports/GatewayUpstreamClient.js";
import {
  NoEligiblePlacementCandidateError,
  type ResolveSyncPlacementUseCase,
  SyncPlacementOrganizationNotFoundError,
  SyncPlacementBuyerCapabilityRequiredError
} from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { WorkloadBundleAdmissionRejectedError } from "../../../src/application/workload/WorkloadBundleAdmissionRejectedError.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function buildGatewayApp(
  execute: ExecuteChatCompletionUseCase["execute"],
  executeEmbedding?: ExecuteEmbeddingUseCase["execute"]
): FastifyInstance {
  return buildApp({
    createOrganizationUseCase: {
      execute: () => Promise.reject(new Error("unused create path"))
    } as unknown as CreateOrganizationUseCase,
    issueOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation path"))
    } as unknown as IssueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused accept path"))
    } as unknown as AcceptOrganizationInvitationUseCase,
    updateOrganizationMemberRoleUseCase: {
      execute: () => Promise.reject(new Error("unused role path"))
    } as unknown as UpdateOrganizationMemberRoleUseCase,
    issueOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused api key path"))
    } as unknown as IssueOrganizationApiKeyUseCase,
    authenticateOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused auth path"))
    } as unknown as AuthenticateOrganizationApiKeyUseCase,
    listPlacementCandidatesUseCase: {
      execute: () => Promise.reject(new Error("unused placement path"))
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: () => Promise.reject(new Error("unused placement resolve path"))
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: {
      execute: () => Promise.reject(new Error("unused enroll path"))
    } as unknown as EnrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase: {
      execute: () => Promise.reject(new Error("unused benchmark path"))
    } as unknown as RecordProviderBenchmarkUseCase,
    listProviderInventoryUseCase: {
      execute: () => Promise.reject(new Error("unused inventory path"))
    } as unknown as ListProviderInventoryUseCase,
    getProviderNodeDetailUseCase: {
      execute: () => Promise.reject(new Error("unused detail path"))
    } as unknown as GetProviderNodeDetailUseCase,
    issueProviderNodeAttestationChallengeUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider attestation challenge path"))
    },
    submitProviderNodeAttestationUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider attestation submit path"))
    },
    upsertProviderNodeRoutingProfileUseCase: {
      execute: () => Promise.reject(new Error("unused routing path"))
    } as unknown as UpsertProviderNodeRoutingProfileUseCase,
    listProviderBenchmarkHistoryUseCase: {
      execute: () => Promise.reject(new Error("unused history path"))
    } as unknown as ListProviderBenchmarkHistoryUseCase,
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.reject(new Error("unused runtime admission path"))
    },
    recordCustomerChargeUseCase: {
      execute: () => Promise.reject(new Error("unused finance charge path"))
    },

    recordCompletedJobSettlementUseCase: {
      execute: () => Promise.reject(new Error("unused finance settlement path"))
    },

    getStagedPayoutExportUseCase: {
      execute: () =>
        Promise.reject(new Error("unused finance payout export path"))
    },

    getOrganizationWalletSummaryUseCase: {
      execute: () => Promise.reject(new Error("unused finance wallet path"))
    },
    getConsumerDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused consumer dashboard path"))
    },
    getProviderDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused provider dashboard path"))
    },

    executeChatCompletionUseCase: {
      execute
    },
    ...(executeEmbedding === undefined
      ? {}
      : {
          executeEmbeddingUseCase: {
            execute: executeEmbedding
          }
        })
  });
}

describe("gateway routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("proxies a valid non-streaming chat completion request", async () => {
    const app = buildGatewayApp(() =>
      Promise.resolve({
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1_772_001_200,
        model: "openai/gpt-oss-120b-like",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: "Hello"
            }
          }
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 18,
          total_tokens: 30
        }
      })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      model: "openai/gpt-oss-120b-like",
      usage: { total_tokens: 30 }
    });
  });

  it("requires a bearer authorization header", async () => {
    const app = buildGatewayApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid gateway request bodies", async () => {
    const app = buildGatewayApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "x",
        messages: []
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps unsupported aliases to 404", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new ApprovedChatModelNotFoundError("unknown-model"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "unknown-model",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps gateway API key authentication failures to 401", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new GatewayApiKeyAuthenticationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps malformed bearer headers to 401", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new GatewayAuthorizationHeaderError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Token nope"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("proxies a valid embedding request", async () => {
    const app = buildGatewayApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.resolve({
          object: "list",
          data: [
            {
              object: "embedding",
              index: 0,
              embedding: [0.1, 0.2, 0.3]
            }
          ],
          model: "cheap-embed-v1",
          usage: {
            prompt_tokens: 3,
            total_tokens: 3
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "cheap-embed-v1",
        input: "hello"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "list",
      model: "cheap-embed-v1",
      usage: { total_tokens: 3 }
    });
  });

  it("maps unsupported embedding aliases to 404", async () => {
    const app = buildGatewayApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.reject(new ApprovedEmbeddingModelNotFoundError("unknown-embed"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "unknown-embed",
        input: "hello"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "APPROVED_EMBEDDING_MODEL_NOT_FOUND"
    });
  });

  it("requires auth and validates embedding request bodies", async () => {
    const app = buildGatewayApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused"))
    );
    apps.push(app);

    const missingAuthResponse = await app.inject({
      method: "POST",
      url: "/v1/embeddings",
      payload: {
        model: "cheap-embed-v1",
        input: "hello"
      }
    });
    const invalidBodyResponse = await app.inject({
      method: "POST",
      url: "/v1/embeddings",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "x",
        input: []
      }
    });

    expect(missingAuthResponse.statusCode).toBe(401);
    expect(invalidBodyResponse.statusCode).toBe(400);
  });

  it("maps embedding auth, placement, domain, admission, and upstream failures", async () => {
    const scenarios = [
      {
        error: new GatewayAuthorizationHeaderError(),
        expectedStatus: 401,
        expectedCode: "GATEWAY_AUTHORIZATION_INVALID"
      },
      {
        error: new DomainValidationError("bad embedding request"),
        expectedStatus: 400,
        expectedCode: "DOMAIN_VALIDATION_ERROR"
      },
      {
        error: new GatewayApiKeyAuthenticationError(),
        expectedStatus: 401,
        expectedCode: "GATEWAY_API_KEY_AUTHENTICATION_ERROR"
      },
      {
        error: new SyncPlacementOrganizationNotFoundError(
          "0d6b1676-f112-41d6-9f98-27277a0dba79"
        ),
        expectedStatus: 404,
        expectedCode: "SYNC_PLACEMENT_ORGANIZATION_NOT_FOUND"
      },
      {
        error: new SyncPlacementBuyerCapabilityRequiredError(),
        expectedStatus: 403,
        expectedCode: "SYNC_PLACEMENT_BUYER_CAPABILITY_REQUIRED"
      },
      {
        error: new NoEligiblePlacementCandidateError(),
        expectedStatus: 404,
        expectedCode: "NO_ELIGIBLE_PLACEMENT_CANDIDATE"
      },
      {
        error: new WorkloadBundleAdmissionRejectedError("signature_invalid"),
        expectedStatus: 503,
        expectedCode: "WORKLOAD_BUNDLE_ADMISSION_REJECTED"
      },
      {
        error: new GatewayUpstreamRequestError("HTTP 502"),
        expectedStatus: 502,
        expectedCode: "GATEWAY_UPSTREAM_REQUEST_ERROR"
      },
      {
        error: new GatewayUpstreamResponseError("invalid payload"),
        expectedStatus: 502,
        expectedCode: "GATEWAY_UPSTREAM_RESPONSE_ERROR"
      }
    ] as const;

    for (const scenario of scenarios) {
      const app = buildGatewayApp(
        () => Promise.reject(new Error("unused")),
        () => Promise.reject(scenario.error)
      );
      apps.push(app);

      const response = await app.inject({
        method: "POST",
        url: "/v1/embeddings",
        headers: {
          authorization: "Bearer csk_gateway_secret_value_000000"
        },
        payload: {
          model: "cheap-embed-v1",
          input: "hello"
        }
      });

      expect(response.statusCode).toBe(scenario.expectedStatus);
      expect(response.json()).toMatchObject({
        error: scenario.expectedCode
      });
    }
  });

  it("returns 404 for embeddings when no embedding use case is wired and 500 for unexpected embedding failures", async () => {
    const routeMissingApp = buildGatewayApp(() =>
      Promise.reject(new Error("unused"))
    );
    apps.push(routeMissingApp);

    const routeMissingResponse = await routeMissingApp.inject({
      method: "POST",
      url: "/v1/embeddings",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "cheap-embed-v1",
        input: "hello"
      }
    });

    expect(routeMissingResponse.statusCode).toBe(404);

    const failingApp = buildGatewayApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unexpected embedding failure"))
    );
    apps.push(failingApp);

    const failingResponse = await failingApp.inject({
      method: "POST",
      url: "/v1/embeddings",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "cheap-embed-v1",
        input: "hello"
      }
    });

    expect(failingResponse.statusCode).toBe(500);
  });

  it("maps no-candidate errors to 404", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new NoEligiblePlacementCandidateError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps buyer capability failures to 403", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new SyncPlacementBuyerCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps placement organization lookup failures to 404", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(
        new SyncPlacementOrganizationNotFoundError(
          "0d6b1676-f112-41d6-9f98-27277a0dba79"
        )
      )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps domain validation failures to 400", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new DomainValidationError("bad gateway request"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps upstream failures to 502", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new GatewayUpstreamRequestError("HTTP 502"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(502);
  });

  it("maps invalid upstream responses to 502", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(new GatewayUpstreamResponseError("invalid payload"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(502);
  });

  it("maps workload admission rejections to 503", async () => {
    const app = buildGatewayApp(() =>
      Promise.reject(
        new WorkloadBundleAdmissionRejectedError("signature_invalid")
      )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(response.statusCode).toBe(503);
  });
});
