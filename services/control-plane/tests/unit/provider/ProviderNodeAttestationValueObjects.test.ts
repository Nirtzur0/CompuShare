import { describe, expect, it } from "vitest";
import { ProviderNodeAttestationChallenge } from "../../../src/domain/provider/ProviderNodeAttestationChallenge.js";
import { parseProviderNodeAttestationStatus } from "../../../src/domain/provider/ProviderNodeAttestationStatus.js";
import { parseProviderNodeAttestationType } from "../../../src/domain/provider/ProviderNodeAttestationType.js";

describe("provider node attestation value objects", () => {
  it("parses supported attestation status values", () => {
    expect(parseProviderNodeAttestationStatus("verified")).toBe("verified");
  });

  it("rejects unsupported attestation status values", () => {
    expect(() => parseProviderNodeAttestationStatus("unknown")).toThrow(
      "Unsupported provider node attestation status: unknown."
    );
  });

  it("parses supported attestation type values", () => {
    expect(parseProviderNodeAttestationType("tpm_quote_v1")).toBe(
      "tpm_quote_v1"
    );
  });

  it("rejects unsupported attestation type values", () => {
    expect(() => parseProviderNodeAttestationType("sev_snp_v1")).toThrow(
      "Unsupported provider node attestation type: sev_snp_v1."
    );
  });

  it("tracks challenge freshness, replay state, and serialization", () => {
    const challenge = ProviderNodeAttestationChallenge.rehydrate({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z"),
      usedAt: new Date("2026-03-10T10:01:00.000Z")
    });

    expect(challenge.isUsed()).toBe(true);
    expect(challenge.isExpired(new Date("2026-03-10T10:06:00.000Z"))).toBe(
      true
    );
    expect(challenge.toSnapshot()).toMatchObject({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      usedAt: "2026-03-10T10:01:00.000Z"
    });
  });

  it("rejects nonces outside the URL-safe attestation policy", () => {
    expect(() =>
      ProviderNodeAttestationChallenge.rehydrate({
        id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        nonce: "short",
        createdAt: new Date("2026-03-10T10:00:00.000Z"),
        expiresAt: new Date("2026-03-10T10:05:00.000Z"),
        usedAt: null
      })
    ).toThrow(
      "Provider node attestation nonce must be a URL-safe string between 32 and 256 characters."
    );
  });
});
