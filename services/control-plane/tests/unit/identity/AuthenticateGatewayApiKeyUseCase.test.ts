import { describe, expect, it } from "vitest";
import {
  AuthenticateGatewayApiKeyUseCase,
  GatewayApiKeyAuthenticationError
} from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { OrganizationApiKey } from "../../../src/domain/identity/OrganizationApiKey.js";
import { OrganizationApiKeySecret } from "../../../src/domain/identity/OrganizationApiKeySecret.js";

describe("AuthenticateGatewayApiKeyUseCase", () => {
  it("authenticates a gateway API key by secret and returns scope", async () => {
    const recordedUsage: { apiKeyId: string; usedAt: Date }[] = [];
    const auditEvents: string[] = [];
    const issuedAt = new Date("2026-03-09T08:00:00.000Z");
    const usedAt = new Date("2026-03-09T09:00:00.000Z");
    const secret = OrganizationApiKeySecret.create(
      "csk_gateway_secret_value_000000"
    );
    const apiKey = OrganizationApiKey.issue({
      organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
      label: "Gateway key",
      environment: "production",
      secretHash: secret.toHash(),
      secretPrefix: secret.toPrefix(),
      createdAt: issuedAt
    });
    const useCase = new AuthenticateGatewayApiKeyUseCase(
      {
        createOrganizationApiKey: () => Promise.reject(new Error("unused")),
        findOrganizationApiKeyBySecretHash: (secretHash) =>
          Promise.resolve(secretHash === apiKey.secretHash ? apiKey : null),
        recordOrganizationApiKeyUsage: (apiKeyId, recordedAt) => {
          recordedUsage.push({ apiKeyId: apiKeyId.value, usedAt: recordedAt });
          return Promise.resolve();
        }
      },
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      () => usedAt
    );

    const result = await useCase.execute({
      secret: "csk_gateway_secret_value_000000"
    });

    expect(result).toMatchObject({
      authorized: true,
      scope: {
        organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production"
      }
    });
    expect(recordedUsage).toEqual([{ apiKeyId: apiKey.id.value, usedAt }]);
    expect(auditEvents).toEqual(["identity.gateway.api_key.authenticated"]);
  });

  it("rejects unknown gateway secrets", async () => {
    const useCase = new AuthenticateGatewayApiKeyUseCase(
      {
        createOrganizationApiKey: () => Promise.reject(new Error("unused")),
        findOrganizationApiKeyBySecretHash: () => Promise.resolve(null),
        recordOrganizationApiKeyUsage: () => Promise.reject(new Error("unused"))
      },
      { record: () => Promise.reject(new Error("unused")) }
    );

    await expect(
      useCase.execute({ secret: "csk_gateway_secret_value_000000" })
    ).rejects.toBeInstanceOf(GatewayApiKeyAuthenticationError);
  });
});
