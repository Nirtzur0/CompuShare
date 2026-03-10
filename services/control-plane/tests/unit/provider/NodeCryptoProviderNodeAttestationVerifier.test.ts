import {
  createHash,
  generateKeyPairSync,
  sign as signPayload
} from "node:crypto";
import { describe, expect, it } from "vitest";
import { ProviderNodeAttestationChallenge } from "../../../src/domain/provider/ProviderNodeAttestationChallenge.js";
import { ProviderNodeAttestationPolicy } from "../../../src/config/ProviderNodeAttestationPolicy.js";
import { NodeCryptoProviderNodeAttestationVerifier } from "../../../src/infrastructure/security/NodeCryptoProviderNodeAttestationVerifier.js";

describe("NodeCryptoProviderNodeAttestationVerifier", () => {
  function buildValidFixture() {
    const policy = ProviderNodeAttestationPolicy.createDefault();
    const verifier = new NodeCryptoProviderNodeAttestationVerifier(policy);
    const challenge = ProviderNodeAttestationChallenge.issue({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z")
    });
    const keyPair = generateKeyPairSync("ec", {
      namedCurve: "P-256"
    });
    const publicKeyPem = keyPair.publicKey.export({
      type: "spki",
      format: "pem"
    });
    const pcrValues = Object.fromEntries(
      Object.entries(policy.allowedPcrValues).map(([index, values]) => [
        index,
        values[0] ?? ""
      ])
    );
    const publicKeyFingerprint = createHash("sha256")
      .update(keyPair.publicKey.export({ type: "spki", format: "der" }))
      .digest("hex");
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const message = JSON.stringify({
      challengeId: challenge.id,
      nonce: challenge.nonce,
      quotedAt,
      secureBootEnabled: true,
      pcrDigestHex
    });
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(message, "utf8"),
      keyPair.privateKey
    ).toString("base64");
    const quoteBase64 = Buffer.from(
      JSON.stringify({
        challengeId: challenge.id,
        nonce: challenge.nonce,
        quotedAt,
        secureBootEnabled: true,
        pcrDigestHex,
        attestationPublicKeyFingerprint: publicKeyFingerprint,
        signatureBase64
      }),
      "utf8"
    ).toString("base64");

    return {
      policy,
      verifier,
      challenge,
      keyPair,
      publicKeyPem: publicKeyPem.toString(),
      pcrValues,
      publicKeyFingerprint,
      quoteBase64
    };
  }

  it("accepts a valid signed TPM quote payload", async () => {
    const {
      verifier,
      challenge,
      publicKeyPem,
      pcrValues,
      publicKeyFingerprint,
      quoteBase64
    } = buildValidFixture();
    const quotedAt = "2026-03-10T10:00:30.000Z";

    const response = await verifier.verify({
      challenge,
      attestationType: "tpm_quote_v1",
      attestationPublicKeyPem: publicKeyPem,
      quoteBase64,
      pcrValues,
      secureBootEnabled: true,
      verifiedAt: new Date("2026-03-10T10:01:00.000Z")
    });

    expect(response.attestationPublicKeyFingerprint).toBe(publicKeyFingerprint);
    expect(response.quotedAt.toISOString()).toBe(quotedAt);
  });

  it("rejects unsupported attestation types", async () => {
    const { verifier, challenge, publicKeyPem, pcrValues, quoteBase64 } =
      buildValidFixture();

    await expect(
      verifier.verify({
        challenge,
        attestationType: "unknown_quote_v1" as unknown as "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64,
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "Unsupported provider node attestation type: unknown_quote_v1."
    );
  });

  it("rejects attestation evidence that violates the PCR allowlist", async () => {
    const policy = ProviderNodeAttestationPolicy.createDefault();
    const verifier = new NodeCryptoProviderNodeAttestationVerifier(policy);
    const challenge = ProviderNodeAttestationChallenge.issue({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z")
    });
    const keyPair = generateKeyPairSync("ec", {
      namedCurve: "P-256"
    });
    const publicKeyPem = keyPair.publicKey.export({
      type: "spki",
      format: "pem"
    });
    const invalidPcrValues = {
      "0": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "2": "2222222222222222222222222222222222222222222222222222222222222222",
      "4": "4444444444444444444444444444444444444444444444444444444444444444",
      "7": "7777777777777777777777777777777777777777777777777777777777777777"
    };
    const publicKeyFingerprint = createHash("sha256")
      .update(keyPair.publicKey.export({ type: "spki", format: "der" }))
      .digest("hex");
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(invalidPcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const message = JSON.stringify({
      challengeId: challenge.id,
      nonce: challenge.nonce,
      quotedAt,
      secureBootEnabled: true,
      pcrDigestHex
    });
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(message, "utf8"),
      keyPair.privateKey
    ).toString("base64");
    const quoteBase64 = Buffer.from(
      JSON.stringify({
        challengeId: challenge.id,
        nonce: challenge.nonce,
        quotedAt,
        secureBootEnabled: true,
        pcrDigestHex,
        attestationPublicKeyFingerprint: publicKeyFingerprint,
        signatureBase64
      }),
      "utf8"
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem.toString(),
        quoteBase64,
        pcrValues: invalidPcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "PCR 0 does not match the configured attestation policy."
    );
  });

  it("rejects invalid attestation public keys", async () => {
    const verifier = new NodeCryptoProviderNodeAttestationVerifier(
      ProviderNodeAttestationPolicy.createDefault()
    );
    const challenge = ProviderNodeAttestationChallenge.issue({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z")
    });

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: "not-a-pem",
        quoteBase64: "cXVvdGU=",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "Attestation public key must be a valid PEM-encoded public key."
    );
  });

  it("rejects quotes signed with the wrong key continuity", async () => {
    const policy = ProviderNodeAttestationPolicy.createDefault();
    const verifier = new NodeCryptoProviderNodeAttestationVerifier(policy);
    const challenge = ProviderNodeAttestationChallenge.issue({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z")
    });
    const keyPair = generateKeyPairSync("ec", {
      namedCurve: "P-256"
    });
    const publicKeyPem = keyPair.publicKey.export({
      type: "spki",
      format: "pem"
    });
    const pcrValues = Object.fromEntries(
      Object.entries(policy.allowedPcrValues).map(([index, values]) => [
        index,
        values[0] ?? ""
      ])
    );
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: true,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem.toString(),
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: true,
            pcrDigestHex,
            attestationPublicKeyFingerprint:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow("Attestation quote public key continuity mismatch.");
  });

  it("rejects quotes with future timestamps", async () => {
    const policy = ProviderNodeAttestationPolicy.createDefault();
    const verifier = new NodeCryptoProviderNodeAttestationVerifier(policy);
    const challenge = ProviderNodeAttestationChallenge.issue({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z")
    });
    const keyPair = generateKeyPairSync("ec", {
      namedCurve: "P-256"
    });
    const publicKeyPem = keyPair.publicKey.export({
      type: "spki",
      format: "pem"
    });
    const pcrValues = Object.fromEntries(
      Object.entries(policy.allowedPcrValues).map(([index, values]) => [
        index,
        values[0] ?? ""
      ])
    );
    const publicKeyFingerprint = createHash("sha256")
      .update(keyPair.publicKey.export({ type: "spki", format: "der" }))
      .digest("hex");
    const quotedAt = "2026-03-10T10:02:00.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: true,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem.toString(),
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: true,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow("Attestation quote timestamp is in the future.");
  });

  it("rejects quote payloads with nonce mismatches", async () => {
    const {
      verifier,
      challenge,
      keyPair,
      publicKeyPem,
      pcrValues,
      publicKeyFingerprint
    } = buildValidFixture();
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: "nonce-mismatch-value-1234567890abcdef",
          quotedAt,
          secureBootEnabled: true,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: "nonce-mismatch-value-1234567890abcdef",
            quotedAt,
            secureBootEnabled: true,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow("Attestation quote nonce mismatch.");
  });

  it("rejects quote payloads with challenge identifier mismatches", async () => {
    const {
      verifier,
      challenge,
      keyPair,
      publicKeyPem,
      pcrValues,
      publicKeyFingerprint
    } = buildValidFixture();
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const mismatchedChallengeId = "d4fd2a10-78d5-4e75-936e-290a9d583f87";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: mismatchedChallengeId,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: true,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: mismatchedChallengeId,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: true,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow("Attestation quote challenge ID mismatch.");
  });

  it("rejects secure boot continuity mismatches", async () => {
    const {
      verifier,
      challenge,
      keyPair,
      publicKeyPem,
      pcrValues,
      publicKeyFingerprint
    } = buildValidFixture();
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: false,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: false,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow("Attestation quote Secure Boot continuity mismatch.");
  });

  it("rejects malformed quote payloads", async () => {
    const { verifier, challenge, publicKeyPem, pcrValues } =
      buildValidFixture();

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: "not-json-but-still-valid-base64bm90LWpzb24=",
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "Attestation quote must be a valid base64-encoded TPM quote payload."
    );
  });

  it("rejects quote payloads missing required TPM fields", async () => {
    const { verifier, challenge, publicKeyPem, pcrValues } =
      buildValidFixture();

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "Attestation quote must be a valid base64-encoded TPM quote payload."
    );
  });

  it("rejects quote payloads with invalid timestamps", async () => {
    const {
      verifier,
      challenge,
      keyPair,
      publicKeyPem,
      pcrValues,
      publicKeyFingerprint
    } = buildValidFixture();
    const quotedAt = "not-a-timestamp";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: true,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: true,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "Attestation quote timestamp must be a valid ISO-8601 datetime."
    );
  });

  it("rejects missing required PCR values", async () => {
    const {
      policy,
      verifier,
      challenge,
      keyPair,
      publicKeyPem,
      publicKeyFingerprint
    } = buildValidFixture();
    const pcrValues = {
      "0": policy.allowedPcrValues["0"]?.[0] ?? "",
      "2": policy.allowedPcrValues["2"]?.[0] ?? "",
      "4": policy.allowedPcrValues["4"]?.[0] ?? ""
    };
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: true,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: true,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: true,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow("Required PCR 7 is missing from attestation evidence.");
  });

  it("rejects attestation evidence when Secure Boot is disabled under policy", async () => {
    const {
      verifier,
      challenge,
      keyPair,
      publicKeyPem,
      pcrValues,
      publicKeyFingerprint
    } = buildValidFixture();
    const quotedAt = "2026-03-10T10:00:30.000Z";
    const pcrDigestHex = createHash("sha256")
      .update(
        Object.entries(pcrValues)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([index, value]) => `${index}:${value}`)
          .join("|"),
        "utf8"
      )
      .digest("hex");
    const signatureBase64 = signPayload(
      "sha256",
      Buffer.from(
        JSON.stringify({
          challengeId: challenge.id,
          nonce: challenge.nonce,
          quotedAt,
          secureBootEnabled: false,
          pcrDigestHex
        }),
        "utf8"
      ),
      keyPair.privateKey
    ).toString("base64");

    await expect(
      verifier.verify({
        challenge,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: publicKeyPem,
        quoteBase64: Buffer.from(
          JSON.stringify({
            challengeId: challenge.id,
            nonce: challenge.nonce,
            quotedAt,
            secureBootEnabled: false,
            pcrDigestHex,
            attestationPublicKeyFingerprint: publicKeyFingerprint,
            signatureBase64
          }),
          "utf8"
        ).toString("base64"),
        pcrValues,
        secureBootEnabled: false,
        verifiedAt: new Date("2026-03-10T10:01:00.000Z")
      })
    ).rejects.toThrow(
      "Secure Boot must be enabled for attested provider nodes."
    );
  });
});
