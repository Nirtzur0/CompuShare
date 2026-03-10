import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../../src/domain/identity/DomainValidationError.js";
import {
  PrivateConnectorExecutionGrant,
  SignedPrivateConnectorExecutionGrant
} from "../../../../src/domain/privateConnector/PrivateConnectorExecutionGrant.js";

describe("PrivateConnectorExecutionGrant", () => {
  it("issues, serializes, rehydrates, and expires grants", () => {
    const grant = PrivateConnectorExecutionGrant.issue({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      environment: "development",
      requestModelAlias: "openai/gpt-oss-120b-like",
      upstreamModelId: "gpt-oss-120b-instruct",
      maxTokens: 4096,
      issuedAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:04:00.000Z")
    });

    const rehydrated = PrivateConnectorExecutionGrant.rehydrate(grant.toSnapshot());

    expect(rehydrated.toCanonicalPayload()).toContain(
      '"requestKind":"chat.completions"'
    );
    expect(rehydrated.isExpired(new Date("2026-03-10T10:03:59.000Z"))).toBe(
      false
    );
    expect(rehydrated.isExpired(new Date("2026-03-10T10:04:01.000Z"))).toBe(
      true
    );

    const signedGrant = SignedPrivateConnectorExecutionGrant.create({
      grant: rehydrated,
      signature:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      signatureKeyId: "local-hmac-v1"
    });

    expect(
      SignedPrivateConnectorExecutionGrant.rehydrate(signedGrant.toSnapshot())
        .toSnapshot()
    ).toEqual(signedGrant.toSnapshot());
  });

  it("rejects invalid TTL, UUIDs, token limits, and signatures", () => {
    expect(() =>
      PrivateConnectorExecutionGrant.issue({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        environment: "development",
        requestModelAlias: "openai/gpt-oss-120b-like",
        upstreamModelId: "gpt-oss-120b-instruct",
        maxTokens: 0,
        issuedAt: new Date("2026-03-10T10:00:00.000Z"),
        expiresAt: new Date("2026-03-10T10:06:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnectorExecutionGrant.rehydrate({
        grantId: "invalid",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        environment: "development",
        requestKind: "chat.completions",
        requestModelAlias: "openai/gpt-oss-120b-like",
        upstreamModelId: "gpt-oss-120b-instruct",
        maxTokens: 4096,
        issuedAt: "2026-03-10T10:00:00.000Z",
        expiresAt: "2026-03-10T10:04:00.000Z"
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      SignedPrivateConnectorExecutionGrant.create({
        grant: PrivateConnectorExecutionGrant.issue({
          organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
          connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
          environment: "development",
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct",
          maxTokens: 4096,
          issuedAt: new Date("2026-03-10T10:00:00.000Z"),
          expiresAt: new Date("2026-03-10T10:04:00.000Z")
        }),
        signature: "deadbeef",
        signatureKeyId: "x"
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnectorExecutionGrant.issue({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        environment: "development",
        requestModelAlias: "x",
        upstreamModelId: "gpt-oss-120b-instruct",
        maxTokens: 4096,
        issuedAt: new Date("2026-03-10T10:00:00.000Z"),
        expiresAt: new Date("2026-03-10T10:04:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });
});
