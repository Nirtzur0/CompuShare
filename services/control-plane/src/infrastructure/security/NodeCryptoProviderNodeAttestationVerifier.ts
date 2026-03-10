import {
  createHash,
  createPublicKey,
  type KeyObject,
  verify as verifySignature
} from "node:crypto";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";
import type { ProviderNodeAttestationVerifier } from "../../application/provider/ports/ProviderNodeAttestationVerifier.js";
import type {
  VerifyProviderNodeAttestationRequest,
  VerifyProviderNodeAttestationResponse
} from "../../application/provider/ports/ProviderNodeAttestationVerifier.js";
import type { ProviderNodeAttestationPolicy } from "../../config/ProviderNodeAttestationPolicy.js";

interface TpmQuotePayload {
  challengeId: string;
  nonce: string;
  quotedAt: string;
  secureBootEnabled: boolean;
  pcrDigestHex: string;
  attestationPublicKeyFingerprint: string;
  signatureBase64: string;
}

export class NodeCryptoProviderNodeAttestationVerifier implements ProviderNodeAttestationVerifier {
  public constructor(private readonly policy: ProviderNodeAttestationPolicy) {}

  public verify(
    request: VerifyProviderNodeAttestationRequest
  ): Promise<VerifyProviderNodeAttestationResponse> {
    return Promise.resolve().then(() => {
      if (request.attestationType !== "tpm_quote_v1") {
        throw new DomainValidationError(
          `Unsupported provider node attestation type: ${request.attestationType}.`
        );
      }

      const publicKey = this.parsePublicKey(request.attestationPublicKeyPem);
      const quote = this.parseQuotePayload(request.quoteBase64);
      const publicKeyFingerprint = this.computePublicKeyFingerprint(publicKey);

      if (quote.challengeId !== request.challenge.id) {
        throw new DomainValidationError(
          "Attestation quote challenge ID mismatch."
        );
      }

      if (quote.nonce !== request.challenge.nonce) {
        throw new DomainValidationError("Attestation quote nonce mismatch.");
      }

      if (quote.secureBootEnabled !== request.secureBootEnabled) {
        throw new DomainValidationError(
          "Attestation quote Secure Boot continuity mismatch."
        );
      }

      if (quote.attestationPublicKeyFingerprint !== publicKeyFingerprint) {
        throw new DomainValidationError(
          "Attestation quote public key continuity mismatch."
        );
      }

      const expectedPcrDigest = this.computePcrDigest(request.pcrValues);

      if (quote.pcrDigestHex !== expectedPcrDigest) {
        throw new DomainValidationError(
          "Attestation quote PCR digest mismatch."
        );
      }

      const quoteMessage = this.buildQuoteMessage({
        challengeId: quote.challengeId,
        nonce: quote.nonce,
        quotedAt: quote.quotedAt,
        secureBootEnabled: quote.secureBootEnabled,
        pcrDigestHex: quote.pcrDigestHex
      });

      if (
        !verifySignature(
          "sha256",
          Buffer.from(quoteMessage, "utf8"),
          publicKey,
          Buffer.from(quote.signatureBase64, "base64")
        )
      ) {
        throw new DomainValidationError("Attestation quote signature invalid.");
      }

      const quotedAt = new Date(quote.quotedAt);

      if (Number.isNaN(quotedAt.getTime())) {
        throw new DomainValidationError(
          "Attestation quote timestamp must be a valid ISO-8601 datetime."
        );
      }

      if (quotedAt.getTime() > request.verifiedAt.getTime()) {
        throw new DomainValidationError(
          "Attestation quote timestamp is in the future."
        );
      }

      if (this.policy.requireSecureBoot && !request.secureBootEnabled) {
        throw new DomainValidationError(
          "Secure Boot must be enabled for attested provider nodes."
        );
      }

      this.assertAllowedPcrValues(request.pcrValues);

      return {
        attestationPublicKeyFingerprint: publicKeyFingerprint,
        quotedAt
      };
    });
  }

  private parsePublicKey(rawValue: string): KeyObject {
    try {
      return createPublicKey(rawValue);
    } catch {
      throw new DomainValidationError(
        "Attestation public key must be a valid PEM-encoded public key."
      );
    }
  }

  private parseQuotePayload(rawValue: string): TpmQuotePayload {
    try {
      const parsed = JSON.parse(
        Buffer.from(rawValue, "base64").toString("utf8")
      ) as Partial<TpmQuotePayload>;

      if (
        typeof parsed.challengeId !== "string" ||
        typeof parsed.nonce !== "string" ||
        typeof parsed.quotedAt !== "string" ||
        typeof parsed.secureBootEnabled !== "boolean" ||
        typeof parsed.pcrDigestHex !== "string" ||
        typeof parsed.attestationPublicKeyFingerprint !== "string" ||
        typeof parsed.signatureBase64 !== "string"
      ) {
        throw new Error("invalid");
      }

      return {
        challengeId: parsed.challengeId,
        nonce: parsed.nonce,
        quotedAt: parsed.quotedAt,
        secureBootEnabled: parsed.secureBootEnabled,
        pcrDigestHex: parsed.pcrDigestHex,
        attestationPublicKeyFingerprint: parsed.attestationPublicKeyFingerprint,
        signatureBase64: parsed.signatureBase64
      };
    } catch {
      throw new DomainValidationError(
        "Attestation quote must be a valid base64-encoded TPM quote payload."
      );
    }
  }

  private computePublicKeyFingerprint(publicKey: KeyObject): string {
    return createHash("sha256")
      .update(publicKey.export({ type: "spki", format: "der" }))
      .digest("hex");
  }

  private computePcrDigest(pcrValues: Record<string, string>): string {
    const normalizedEntries = Object.entries(pcrValues)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([index, value]) => `${index}:${value.toLowerCase()}`);

    return createHash("sha256")
      .update(normalizedEntries.join("|"), "utf8")
      .digest("hex");
  }

  private assertAllowedPcrValues(pcrValues: Record<string, string>): void {
    for (const [index, allowedValues] of Object.entries(
      this.policy.allowedPcrValues
    )) {
      const candidateValue = pcrValues[index]?.toLowerCase();

      if (candidateValue === undefined) {
        throw new DomainValidationError(
          `Required PCR ${index} is missing from attestation evidence.`
        );
      }

      if (
        !allowedValues
          .map((value) => value.toLowerCase())
          .includes(candidateValue)
      ) {
        throw new DomainValidationError(
          `PCR ${index} does not match the configured attestation policy.`
        );
      }
    }
  }

  private buildQuoteMessage(input: {
    challengeId: string;
    nonce: string;
    quotedAt: string;
    secureBootEnabled: boolean;
    pcrDigestHex: string;
  }): string {
    return JSON.stringify({
      challengeId: input.challengeId,
      nonce: input.nonce,
      quotedAt: input.quotedAt,
      secureBootEnabled: input.secureBootEnabled,
      pcrDigestHex: input.pcrDigestHex
    });
  }
}
