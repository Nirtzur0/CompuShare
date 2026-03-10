import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { GatewayApiKeyAuthenticationError } from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { GatewayFileNotFoundError } from "../../../src/application/batch/GetGatewayFileUseCase.js";
import type { GetGatewayFileUseCase } from "../../../src/application/batch/GetGatewayFileUseCase.js";
import { registerFileRoutes } from "../../../src/interfaces/http/fileRoutes.js";

function createMultipartPayload(parts: {
  purpose: string;
  filename: string;
  contentType: string;
  content: string;
}) {
  const boundary = "----CompuShareBoundary";
  const payload = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="purpose"',
    "",
    parts.purpose,
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${parts.filename}"`,
    `Content-Type: ${parts.contentType}`,
    "",
    parts.content,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  return {
    boundary,
    payload
  };
}

function createApp(
  uploadExecute: (typeof Promise)["resolve"] extends never
    ? never
    : Parameters<typeof registerFileRoutes>[1]["execute"],
  getExecute: Parameters<typeof registerFileRoutes>[2]["execute"]
): FastifyInstance {
  const app = Fastify();
  void app.register(multipart);
  registerFileRoutes(app, { execute: uploadExecute }, {
    execute: getExecute
  } as Pick<GetGatewayFileUseCase, "execute">);
  return app;
}

describe("file routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("uploads a batch input file", async () => {
    const app = createApp(
      (request) =>
        Promise.resolve({
          file: {
            id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
            organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
            environment: "development",
            purpose: request.purpose,
            filename: request.filename,
            mediaType: request.mediaType,
            bytes: request.bytes,
            createdByUserId: "user-1",
            createdAt: "2026-03-18T09:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused"))
    );
    apps.push(app);
    const body = createMultipartPayload({
      purpose: "batch",
      filename: "input.jsonl",
      contentType: "application/jsonl",
      content:
        '{"custom_id":"item-1","method":"POST","url":"/v1/embeddings","body":{"model":"cheap-embed-v1","input":"hello"}}'
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000",
        "content-type": `multipart/form-data; boundary=${body.boundary}`
      },
      payload: body.payload
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "file",
      purpose: "batch",
      filename: "input.jsonl"
    });
  });

  it("maps gateway auth failures on upload to 401", async () => {
    const app = createApp(
      () => {
        throw new GatewayApiKeyAuthenticationError();
      },
      () => Promise.reject(new Error("unused"))
    );
    apps.push(app);
    const body = createMultipartPayload({
      purpose: "batch",
      filename: "input.jsonl",
      contentType: "application/jsonl",
      content: '{"custom_id":"item-1"}'
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000",
        "content-type": `multipart/form-data; boundary=${body.boundary}`
      },
      payload: body.payload
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR"
    });
  });

  it("returns file metadata and content for authorized requests", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.resolve({
          file: {
            id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
            organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
            environment: "development",
            purpose: "batch",
            filename: "input.jsonl",
            mediaType: "application/jsonl",
            bytes: 42,
            createdByUserId: "user-1",
            createdAt: "2026-03-18T09:00:00.000Z"
          },
          content: '{"ok":true}\n'
        })
    );
    apps.push(app);

    const metadataResponse = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });
    const contentResponse = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da/content",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(metadataResponse.statusCode).toBe(200);
    expect(metadataResponse.json()).toMatchObject({
      object: "file",
      filename: "input.jsonl"
    });
    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.body).toBe('{"ok":true}\n');
  });

  it("maps file lookup misses to 404", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => {
        throw new GatewayFileNotFoundError(
          "dcbb9c3d-6cf9-4235-a553-110691ecf3da"
        );
      }
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "GATEWAY_FILE_NOT_FOUND"
    });
  });

  it("maps file content lookup misses to 404", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => {
        throw new GatewayFileNotFoundError(
          "dcbb9c3d-6cf9-4235-a553-110691ecf3da"
        );
      }
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da/content",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "GATEWAY_FILE_NOT_FOUND"
    });
  });

  it("validates missing auth, missing file uploads, invalid purpose, and file auth failures", async () => {
    const app = createApp(
      () => {
        throw new DomainValidationError("Invalid file.");
      },
      () => {
        throw new GatewayApiKeyAuthenticationError();
      }
    );
    apps.push(app);

    const missingAuthResponse = await app.inject({
      method: "POST",
      url: "/v1/files"
    });
    const missingFileResponse = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000",
        "content-type": "multipart/form-data; boundary=----CompuShareBoundary"
      },
      payload: "------CompuShareBoundary--\r\n"
    });
    const invalidPurposeBody = createMultipartPayload({
      purpose: "fine-tune",
      filename: "input.jsonl",
      contentType: "application/jsonl",
      content: '{"custom_id":"item-1"}'
    });
    const invalidPurposeResponse = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000",
        "content-type": `multipart/form-data; boundary=${invalidPurposeBody.boundary}`
      },
      payload: invalidPurposeBody.payload
    });
    const domainValidationBody = createMultipartPayload({
      purpose: "batch",
      filename: "input.jsonl",
      contentType: "application/jsonl",
      content: '{"custom_id":"item-1"}'
    });
    const domainValidationResponse = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000",
        "content-type": `multipart/form-data; boundary=${domainValidationBody.boundary}`
      },
      payload: domainValidationBody.payload
    });
    const fileAuthFailureResponse = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });
    const contentMissingAuthResponse = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da/content"
    });
    const invalidFileIdResponse = await app.inject({
      method: "GET",
      url: "/v1/files/not-a-uuid/content",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(missingAuthResponse.statusCode).toBe(401);
    expect(missingFileResponse.statusCode).toBe(400);
    expect(invalidPurposeResponse.statusCode).toBe(400);
    expect(domainValidationResponse.statusCode).toBe(400);
    expect(fileAuthFailureResponse.statusCode).toBe(401);
    expect(contentMissingAuthResponse.statusCode).toBe(401);
    expect(invalidFileIdResponse.statusCode).toBe(400);
  });

  it("maps gateway auth failures on file content reads to 401", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => {
        throw new GatewayApiKeyAuthenticationError();
      }
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da/content",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR"
    });
  });

  it("returns 500 for unexpected file content lookup failures", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => {
        throw new Error("unexpected content lookup failure");
      }
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/files/dcbb9c3d-6cf9-4235-a553-110691ecf3da/content",
      headers: {
        authorization: "Bearer csk_gateway_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(500);
  });
});
