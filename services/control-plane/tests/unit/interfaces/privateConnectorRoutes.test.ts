import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import {
  PrivateConnectorAuthorizationError,
  PrivateConnectorBuyerCapabilityRequiredError,
  PrivateConnectorOrganizationNotFoundError
} from "../../../src/application/privateConnector/CreatePrivateConnectorUseCase.js";
import { PrivateConnectorExecutionGrantRejectedError } from "../../../src/application/privateConnector/AdmitPrivateConnectorExecutionGrantUseCase.js";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError
} from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import {
  PrivateConnectorEnvironmentMismatchError,
  PrivateConnectorNotFoundError
} from "../../../src/application/privateConnector/RecordPrivateConnectorCheckInUseCase.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { registerPrivateConnectorRoutes } from "../../../src/interfaces/http/privateConnectorRoutes.js";

function createApp(input?: {
  createExecute?: () => Promise<unknown>;
  listExecute?: () => Promise<unknown>;
  checkInExecute?: () => Promise<unknown>;
  admitExecute?: () => Promise<unknown>;
  authenticateExecute?: () => Promise<{
    apiKey: {
      issuedByUserId: string;
    };
  }>;
}): FastifyInstance {
  const app = Fastify();

  registerPrivateConnectorRoutes(
    app,
    {
      execute:
        input?.authenticateExecute ??
        (() =>
          Promise.resolve({
            apiKey: {
              issuedByUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
            }
          }))
    } as never,
    {
      execute:
        input?.createExecute ??
        (() =>
          Promise.resolve({
            connector: {
              id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              environment: "development",
              label: "Primary connector",
              mode: "cluster",
              endpointUrl: "http://connector.internal",
              modelMappings: [],
              runtimeVersion: null,
              createdAt: "2026-03-10T10:00:00.000Z",
              lastCheckInAt: null,
              lastReadyAt: null,
              disabledAt: null
            }
          }))
    } as never,
    {
      execute:
        input?.listExecute ??
        (() =>
          Promise.resolve({
            connectors: []
          }))
    } as never,
    {
      execute:
        input?.checkInExecute ??
        (() =>
          Promise.resolve({
            connector: {
              id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0"
            },
            status: "ready"
          }))
    } as never,
    {
      execute:
        input?.admitExecute ??
        (() =>
          Promise.resolve({
            admission: {
              admitted: true,
              grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
              connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              upstreamModelId: "gpt-oss-120b-instruct",
              admittedAt: "2026-03-10T10:00:00.000Z"
            }
          }))
    } as never
  );

  return app;
}

describe("private connector routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("creates private connectors", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      connector: {
        label: "Primary connector"
      }
    });
  });

  it("lists private connectors", async () => {
    const app = createApp({
      listExecute: () =>
        Promise.resolve({
          connectors: [
            {
              id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0"
            }
          ]
        })
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      connectors: [{ id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0" }]
    });
  });

  it("passes optional environment filters to the list use case", async () => {
    const listExecute = vi.fn(() =>
      Promise.resolve({
        connectors: []
      })
    );
    const app = createApp({
      listExecute
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f&environment=staging"
    });

    expect(response.statusCode).toBe(200);
    expect(listExecute).toHaveBeenCalledWith({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "staging"
    });
  });

  it("requires the organization API key for check-ins", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: "ORGANIZATION_API_KEY_MISSING"
    });
  });

  it("maps runtime admission rejection to 403", async () => {
    const app = createApp({
      admitExecute: () =>
        Promise.reject(
          new PrivateConnectorExecutionGrantRejectedError("signature_invalid")
        )
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_RUNTIME_ADMISSION_REJECTED"
    });
  });

  it("maps management authorization failures to 403", async () => {
    const app = createApp({
      createExecute: () =>
        Promise.reject(new PrivateConnectorAuthorizationError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_AUTHORIZATION_ERROR"
    });
  });

  it("maps buyer capability failures on create routes to 403", async () => {
    const app = createApp({
      createExecute: () =>
        Promise.reject(new PrivateConnectorBuyerCapabilityRequiredError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_BUYER_CAPABILITY_REQUIRED"
    });
  });

  it("validates create payloads before executing the use case", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "x",
        mode: "cluster",
        endpointUrl: "not-a-url",
        modelMappings: []
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("validates create route params", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps buyer capability failures on list routes to 403", async () => {
    const app = createApp({
      listExecute: () =>
        Promise.reject(new PrivateConnectorBuyerCapabilityRequiredError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_BUYER_CAPABILITY_REQUIRED"
    });
  });

  it("maps list not-found and authorization failures", async () => {
    const notFoundApp = createApp({
      listExecute: () =>
        Promise.reject(
          new PrivateConnectorOrganizationNotFoundError(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          )
        )
    });
    apps.push(notFoundApp);

    const notFoundResponse = await notFoundApp.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(notFoundResponse.statusCode).toBe(404);

    const authApp = createApp({
      listExecute: () =>
        Promise.reject(new PrivateConnectorAuthorizationError())
    });
    apps.push(authApp);

    const authResponse = await authApp.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(authResponse.statusCode).toBe(403);
  });

  it("maps unexpected list failures to 500", async () => {
    const app = createApp({
      listExecute: () => Promise.reject(new Error("boom"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(500);
  });

  it("records successful connector check-ins", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ready"
    });
  });

  it("maps check-in authentication and connector state errors", async () => {
    const authErrorApp = createApp({
      authenticateExecute: () =>
        Promise.reject(new OrganizationApiKeyAuthenticationError())
    });
    apps.push(authErrorApp);

    const authErrorResponse = await authErrorApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(authErrorResponse.statusCode).toBe(401);
    expect(authErrorResponse.json()).toMatchObject({
      error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR"
    });

    const scopeMismatchApp = createApp({
      authenticateExecute: () =>
        Promise.reject(new OrganizationApiKeyScopeMismatchError())
    });
    apps.push(scopeMismatchApp);

    const scopeMismatchResponse = await scopeMismatchApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(scopeMismatchResponse.statusCode).toBe(403);
    expect(scopeMismatchResponse.json()).toMatchObject({
      error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH"
    });

    const notFoundApp = createApp({
      checkInExecute: () =>
        Promise.reject(
          new PrivateConnectorNotFoundError(
            "05e1c781-8e39-40f6-ac01-1329e4d95ef0"
          )
        )
    });
    apps.push(notFoundApp);

    const notFoundResponse = await notFoundApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(notFoundResponse.statusCode).toBe(404);
    expect(notFoundResponse.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_NOT_FOUND"
    });

    const mismatchApp = createApp({
      checkInExecute: () =>
        Promise.reject(new PrivateConnectorEnvironmentMismatchError())
    });
    apps.push(mismatchApp);

    const mismatchResponse = await mismatchApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(mismatchResponse.statusCode).toBe(409);
    expect(mismatchResponse.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_ENVIRONMENT_MISMATCH"
    });
  });

  it("returns runtime admission success and domain validation failures", async () => {
    const app = createApp();
    apps.push(app);

    const successResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(successResponse.statusCode).toBe(200);
    expect(successResponse.json()).toMatchObject({
      admission: {
        admitted: true
      }
    });

    const validationApp = createApp({
      admitExecute: () =>
        Promise.reject(new DomainValidationError("invalid grant payload"))
    });
    apps.push(validationApp);

    const validationResponse = await validationApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(validationResponse.statusCode).toBe(400);
    expect(validationResponse.json()).toMatchObject({
      error: "DOMAIN_VALIDATION_ERROR"
    });
  });

  it("maps create not-found and domain validation failures", async () => {
    const notFoundApp = createApp({
      createExecute: () =>
        Promise.reject(
          new PrivateConnectorOrganizationNotFoundError(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          )
        )
    });
    apps.push(notFoundApp);

    const notFoundResponse = await notFoundApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(notFoundResponse.statusCode).toBe(404);

    const domainValidationApp = createApp({
      createExecute: () =>
        Promise.reject(new DomainValidationError("duplicate alias"))
    });
    apps.push(domainValidationApp);

    const domainValidationResponse = await domainValidationApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(domainValidationResponse.statusCode).toBe(400);
    expect(domainValidationResponse.json()).toMatchObject({
      error: "DOMAIN_VALIDATION_ERROR"
    });
  });

  it("validates list and check-in route params and bodies", async () => {
    const app = createApp();
    apps.push(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/private-connectors?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(listResponse.statusCode).toBe(400);

    const checkInResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/not-a-uuid/check-ins",
      payload: {
        runtimeVersion: 123
      }
    });

    expect(checkInResponse.statusCode).toBe(400);
    expect(checkInResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("validates check-in bodies when route params are valid", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: 123
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("validates list queries and runtime-admission payloads and headers", async () => {
    const app = createApp();
    apps.push(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors?actorUserId=not-a-uuid"
    });

    expect(listResponse.statusCode).toBe(400);

    const runtimeValidationResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "invalid"
          }
        }
      }
    });

    expect(runtimeValidationResponse.statusCode).toBe(400);

    const runtimeMissingHeaderResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(runtimeMissingHeaderResponse.statusCode).toBe(401);
  });

  it("validates runtime-admission route params when the body is otherwise valid", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("maps runtime admission authentication and connector lookup errors", async () => {
    const authErrorApp = createApp({
      authenticateExecute: () =>
        Promise.reject(new OrganizationApiKeyAuthenticationError())
    });
    apps.push(authErrorApp);

    const authErrorResponse = await authErrorApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(authErrorResponse.statusCode).toBe(401);

    const scopeMismatchApp = createApp({
      authenticateExecute: () =>
        Promise.reject(new OrganizationApiKeyScopeMismatchError())
    });
    apps.push(scopeMismatchApp);

    const scopeMismatchResponse = await scopeMismatchApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(scopeMismatchResponse.statusCode).toBe(403);

    const mismatchApp = createApp({
      admitExecute: () =>
        Promise.reject(new PrivateConnectorEnvironmentMismatchError())
    });
    apps.push(mismatchApp);

    const mismatchResponse = await mismatchApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(mismatchResponse.statusCode).toBe(409);

    const notFoundApp = createApp({
      admitExecute: () =>
        Promise.reject(
          new PrivateConnectorNotFoundError(
            "05e1c781-8e39-40f6-ac01-1329e4d95ef0"
          )
        )
    });
    apps.push(notFoundApp);

    const notFoundResponse = await notFoundApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(notFoundResponse.statusCode).toBe(404);
  });

  it("maps unexpected create and runtime-admission failures to 500", async () => {
    const createErrorApp = createApp({
      createExecute: () => Promise.reject(new Error("boom"))
    });
    apps.push(createErrorApp);

    const createErrorResponse = await createErrorApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/private-connectors",
      payload: {
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      }
    });

    expect(createErrorResponse.statusCode).toBe(500);

    const runtimeErrorApp = createApp({
      admitExecute: () => Promise.reject(new Error("boom"))
    });
    apps.push(runtimeErrorApp);

    const runtimeErrorResponse = await runtimeErrorApp.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/runtime-admissions",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        signedGrant: {
          grant: {
            grantId: "48374f8f-bfea-4fd9-bdfc-430d0a03a7e8",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z"
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(runtimeErrorResponse.statusCode).toBe(500);
  });

  it("maps unexpected check-in failures to 500", async () => {
    const app = createApp({
      checkInExecute: () => Promise.reject(new Error("boom"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/environments/development/private-connectors/05e1c781-8e39-40f6-ac01-1329e4d95ef0/check-ins",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000"
      },
      payload: {
        runtimeVersion: "runtime-1"
      }
    });

    expect(response.statusCode).toBe(500);
  });
});
