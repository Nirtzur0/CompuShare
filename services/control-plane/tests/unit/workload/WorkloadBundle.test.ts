import { describe, expect, it } from "vitest";
import { WorkloadBundle } from "../../../src/domain/workload/WorkloadBundle.js";
import { SignedWorkloadBundle } from "../../../src/domain/workload/SignedWorkloadBundle.js";

describe("WorkloadBundle", () => {
  it("issues a canonical chat workload bundle snapshot", () => {
    const bundle = WorkloadBundle.issue({
      modelManifestId: "chat-gpt-oss-120b-like-v1",
      imageDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      runtimeConfig: {
        requestKind: "chat.completions",
        streamingEnabled: false,
        maxTokens: 2048,
        temperature: 0.6,
        topP: 0.9
      },
      networkPolicy: "provider-endpoint-only",
      maxRuntimeSeconds: 120,
      customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      createdAt: new Date("2026-03-09T20:30:00.000Z")
    });

    expect(bundle.toSnapshot()).toMatchObject({
      modelManifestId: "chat-gpt-oss-120b-like-v1",
      networkPolicy: "provider-endpoint-only",
      maxRuntimeSeconds: 120,
      customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      sensitivityClass: "standard_business",
      runtimeConfig: {
        requestKind: "chat.completions",
        streamingEnabled: false,
        maxTokens: 2048,
        temperature: 0.6,
        topP: 0.9
      }
    });
    expect(bundle.toCanonicalPayload()).toContain(
      '"modelManifestId":"chat-gpt-oss-120b-like-v1"'
    );
  });

  it("rejects unsupported bundle digests and invalid signatures", () => {
    expect(() =>
      WorkloadBundle.issue({
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest: "bad-digest",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 2048,
          temperature: null,
          topP: null
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        createdAt: new Date("2026-03-09T20:30:00.000Z")
      })
    ).toThrow("Workload image digest must be a sha256 digest.");

    const bundle = WorkloadBundle.issue({
      modelManifestId: "chat-gpt-oss-120b-like-v1",
      imageDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      runtimeConfig: {
        requestKind: "chat.completions",
        streamingEnabled: false,
        maxTokens: 2048,
        temperature: null,
        topP: null
      },
      networkPolicy: "provider-endpoint-only",
      maxRuntimeSeconds: 120,
      customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      createdAt: new Date("2026-03-09T20:30:00.000Z")
    });

    expect(() =>
      SignedWorkloadBundle.create({
        bundle,
        signature: "not-hex",
        signatureKeyId: "local-hmac-v1"
      })
    ).toThrow(
      "Signed workload bundle signature must be a 64-character hex digest."
    );
  });

  it("rehydrates a signed workload bundle snapshot", () => {
    const signedBundle = SignedWorkloadBundle.rehydrate({
      bundle: {
        id: "750f8c98-ab40-4a25-8a76-1f6d91608127",
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 2048,
          temperature: null,
          topP: null
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        sensitivityClass: "standard_business",
        createdAt: "2026-03-09T20:30:00.000Z"
      },
      signature:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      signatureKeyId: "local-hmac-v1"
    });

    expect(signedBundle.toSnapshot().bundle.id).toBe(
      "750f8c98-ab40-4a25-8a76-1f6d91608127"
    );
  });

  it("rejects invalid rehydrated bundle snapshots and runtime config values", () => {
    expect(() =>
      WorkloadBundle.rehydrate({
        id: "not-a-uuid",
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 2048,
          temperature: null,
          topP: null
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        sensitivityClass: "standard_business",
        createdAt: new Date("2026-03-09T20:30:00.000Z")
      })
    ).toThrow("Workload bundle ID must be a valid UUID.");

    expect(() =>
      WorkloadBundle.issue({
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 150000,
          temperature: null,
          topP: null
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        createdAt: new Date("2026-03-09T20:30:00.000Z")
      })
    ).toThrow("Workload max tokens must be at most 131072.");

    expect(() =>
      WorkloadBundle.issue({
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 2048,
          temperature: 3,
          topP: null
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        createdAt: new Date("2026-03-09T20:30:00.000Z")
      })
    ).toThrow("Workload temperature must be between 0 and 2 when provided.");

    expect(() =>
      WorkloadBundle.issue({
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 2048,
          temperature: null,
          topP: 0
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        createdAt: new Date("2026-03-09T20:30:00.000Z")
      })
    ).toThrow(
      "Workload top-p must be greater than 0 and at most 1 when provided."
    );
  });
});
