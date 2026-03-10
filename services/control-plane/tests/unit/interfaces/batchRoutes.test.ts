import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import type {
  GatewayBatchJobSnapshot,
  GatewayBatchStatus
} from "../../../src/domain/batch/GatewayBatchJob.js";
import { GatewayBatchNotFoundError } from "../../../src/application/batch/GetGatewayBatchUseCase.js";
import { GatewayFileNotFoundError } from "../../../src/application/batch/GetGatewayFileUseCase.js";
import { GatewayApiKeyAuthenticationError } from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { registerBatchRoutes } from "../../../src/interfaces/http/batchRoutes.js";

interface BatchRouteResponse {
  in_progress_at?: number | null;
  completed_at?: number | null;
}

function createBatchSnapshot(
  overrides?: Partial<{
    id: string;
    status: GatewayBatchStatus;
    outputFileId: string | null;
    errorFileId: string | null;
    inProgressAt: string | null;
    completedAt: string | null;
  }>
): GatewayBatchJobSnapshot {
  return {
    id: overrides?.id ?? "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
    organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
    environment: "development",
    inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
    outputFileId: overrides?.outputFileId ?? null,
    errorFileId: overrides?.errorFileId ?? null,
    endpoint: "/v1/embeddings",
    completionWindow: "24h",
    status: overrides?.status ?? "validating",
    createdByUserId: "user-1",
    createdAt: "2026-03-18T09:00:00.000Z",
    inProgressAt: overrides?.inProgressAt ?? null,
    completedAt: overrides?.completedAt ?? null,
    requestCounts: {
      total: 2,
      completed: 0,
      failed: 0
    }
  };
}

function createApp(input: {
  createExecute: Parameters<typeof registerBatchRoutes>[1]["execute"];
  getExecute: Parameters<typeof registerBatchRoutes>[2]["execute"];
  cancelExecute: Parameters<typeof registerBatchRoutes>[3]["execute"];
}): FastifyInstance {
  const app = Fastify();
  registerBatchRoutes(
    app,
    { execute: input.createExecute },
    { execute: input.getExecute },
    { execute: input.cancelExecute }
  );
  return app;
}

describe("batch routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("creates a batch", async () => {
    const app = createApp({
      createExecute: () =>
        Promise.resolve({
          batch: createBatchSnapshot()
        }),
      getExecute: () => Promise.reject(new Error("unused")),
      cancelExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/batches",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        input_file_id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        endpoint: "/v1/embeddings",
        completion_window: "24h"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "batch",
      endpoint: "/v1/embeddings",
      input_file_id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da"
    });
  });

  it("maps missing files during batch creation to 404", async () => {
    const app = createApp({
      createExecute: () => {
        throw new GatewayFileNotFoundError(
          "dcbb9c3d-6cf9-4235-a553-110691ecf3da"
        );
      },
      getExecute: () => Promise.reject(new Error("unused")),
      cancelExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/batches",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        input_file_id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        endpoint: "/v1/embeddings",
        completion_window: "24h"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "GATEWAY_FILE_NOT_FOUND"
    });
  });

  it("retrieves and cancels batches", async () => {
    const app = createApp({
      createExecute: () => Promise.reject(new Error("unused")),
      getExecute: () =>
        Promise.resolve({
          batch: createBatchSnapshot({
            status: "in_progress"
          })
        }),
      cancelExecute: () =>
        Promise.resolve({
          batch: createBatchSnapshot({
            status: "cancelling"
          })
        })
    });
    apps.push(app);

    const getResponse = await app.inject({
      method: "GET",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });
    const cancelResponse = await app.inject({
      method: "POST",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3/cancel",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      object: "batch",
      status: "in_progress"
    });
    expect(cancelResponse.statusCode).toBe(200);
    expect(cancelResponse.json()).toMatchObject({
      object: "batch",
      status: "cancelling"
    });
  });

  it("serializes non-null output, error, and completion timestamps", async () => {
    const app = createApp({
      createExecute: () => Promise.reject(new Error("unused")),
      getExecute: () =>
        Promise.resolve({
          batch: createBatchSnapshot({
            status: "completed",
            outputFileId: "4474e896-8278-4e6a-bcde-8cec2f390479",
            errorFileId: "b4680302-b62a-4961-9218-3cf60eb2a771",
            inProgressAt: "2026-03-18T09:01:00.000Z",
            completedAt: "2026-03-18T09:05:00.000Z"
          })
        }),
      cancelExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      output_file_id: "4474e896-8278-4e6a-bcde-8cec2f390479",
      error_file_id: "b4680302-b62a-4961-9218-3cf60eb2a771"
    });
    const body = response.json<BatchRouteResponse>();
    expect(body.in_progress_at).toBeTypeOf("number");
    expect(body.completed_at).toBeTypeOf("number");
  });

  it("maps auth and batch lookup failures", async () => {
    const app = createApp({
      createExecute: () => {
        throw new GatewayApiKeyAuthenticationError();
      },
      getExecute: () => {
        throw new GatewayBatchNotFoundError(
          "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
        );
      },
      cancelExecute: () => {
        throw new GatewayBatchNotFoundError(
          "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
        );
      }
    });
    apps.push(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/batches",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        input_file_id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        endpoint: "/v1/embeddings",
        completion_window: "24h"
      }
    });
    const getResponse = await app.inject({
      method: "GET",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(createResponse.statusCode).toBe(401);
    expect(getResponse.statusCode).toBe(404);
  });

  it("maps cancel lookup failures and missing cancel auth", async () => {
    const app = createApp({
      createExecute: () => Promise.reject(new Error("unused")),
      getExecute: () => Promise.reject(new Error("unused")),
      cancelExecute: () => {
        throw new GatewayBatchNotFoundError(
          "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
        );
      }
    });
    apps.push(app);

    const missingAuthResponse = await app.inject({
      method: "POST",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3/cancel"
    });
    const notFoundResponse = await app.inject({
      method: "POST",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3/cancel",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(missingAuthResponse.statusCode).toBe(401);
    expect(notFoundResponse.statusCode).toBe(404);
  });

  it("returns 500 for unexpected get and cancel failures", async () => {
    const app = createApp({
      createExecute: () => Promise.reject(new Error("unused")),
      getExecute: () => {
        throw new Error("unexpected get failure");
      },
      cancelExecute: () => {
        throw new Error("unexpected cancel failure");
      }
    });
    apps.push(app);

    const getResponse = await app.inject({
      method: "GET",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });
    const cancelResponse = await app.inject({
      method: "POST",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3/cancel",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(getResponse.statusCode).toBe(500);
    expect(cancelResponse.statusCode).toBe(500);
  });

  it("validates request bodies, params, and missing authorization headers", async () => {
    const app = createApp({
      createExecute: () => Promise.reject(new Error("unused")),
      getExecute: () => Promise.reject(new Error("unused")),
      cancelExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const invalidCreateResponse = await app.inject({
      method: "POST",
      url: "/v1/batches",
      payload: {
        input_file_id: "not-a-uuid",
        endpoint: "/v1/embeddings",
        completion_window: "24h"
      }
    });
    const missingAuthGetResponse = await app.inject({
      method: "GET",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
    });
    const invalidCancelResponse = await app.inject({
      method: "POST",
      url: "/v1/batches/not-a-uuid/cancel",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(invalidCreateResponse.statusCode).toBe(400);
    expect(missingAuthGetResponse.statusCode).toBe(401);
    expect(invalidCancelResponse.statusCode).toBe(400);
  });

  it("maps domain validation and auth failures on get and cancel", async () => {
    const app = createApp({
      createExecute: () => {
        throw new DomainValidationError("Bad batch request.");
      },
      getExecute: () => {
        throw new GatewayApiKeyAuthenticationError();
      },
      cancelExecute: () => {
        throw new GatewayApiKeyAuthenticationError();
      }
    });
    apps.push(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/batches",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      },
      payload: {
        input_file_id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        endpoint: "/v1/embeddings",
        completion_window: "24h"
      }
    });
    const getResponse = await app.inject({
      method: "GET",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });
    const cancelResponse = await app.inject({
      method: "POST",
      url: "/v1/batches/70d0bf75-8713-4627-9ff7-c65f8d08c8c3/cancel",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(createResponse.statusCode).toBe(400);
    expect(getResponse.statusCode).toBe(401);
    expect(cancelResponse.statusCode).toBe(401);
  });
});
