import type { ProviderNodeAttestationChallenge } from "../../../domain/provider/ProviderNodeAttestationChallenge.js";
export interface VerifyProviderNodeAttestationRequest {
  challenge: ProviderNodeAttestationChallenge;
  attestationType: string;
  attestationPublicKeyPem: string;
  quoteBase64: string;
  pcrValues: Record<string, string>;
  secureBootEnabled: boolean;
  verifiedAt: Date;
}

export interface VerifyProviderNodeAttestationResponse {
  attestationPublicKeyFingerprint: string;
  quotedAt: Date;
}

export interface ProviderNodeAttestationVerifier {
  verify(
    request: VerifyProviderNodeAttestationRequest
  ): Promise<VerifyProviderNodeAttestationResponse>;
}
