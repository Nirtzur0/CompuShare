import { randomUUID } from "node:crypto";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderNodeAttestationRecord } from "../../domain/provider/ProviderNodeAttestationRecord.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import { parseProviderNodeAttestationType } from "../../domain/provider/ProviderNodeAttestationType.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderNodeAttestationRepository } from "./ports/ProviderNodeAttestationRepository.js";
import type { ProviderNodeAttestationVerifier } from "./ports/ProviderNodeAttestationVerifier.js";
import type { ProviderNodeAttestationPolicy } from "../../config/ProviderNodeAttestationPolicy.js";
import {
  ProviderNodeAttestationCapabilityRequiredError,
  ProviderNodeAttestationNodeNotFoundError,
  ProviderNodeAttestationOrganizationNotFoundError,
  ProviderNodeAttestationRuntimeUnsupportedError
} from "./IssueProviderNodeAttestationChallengeUseCase.js";

export interface SubmitProviderNodeAttestationRequest {
  organizationId: string;
  providerNodeId: string;
  challengeId: string;
  attestationType: string;
  attestationPublicKeyPem: string;
  quoteBase64: string;
  pcrValues: Record<string, string>;
  secureBootEnabled: boolean;
}

export interface SubmitProviderNodeAttestationResponse {
  attestation: {
    status: "verified";
    effectiveTrustTier: "t2_attested";
    lastAttestedAt: string;
    attestationExpiresAt: string;
    attestationType: string;
  };
}

export class ProviderNodeAttestationChallengeNotFoundError extends Error {
  public constructor(challengeId: string) {
    super(`Attestation challenge "${challengeId}" was not found.`);
    this.name = "ProviderNodeAttestationChallengeNotFoundError";
  }
}

export class ProviderNodeAttestationChallengeExpiredError extends Error {
  public constructor(challengeId: string) {
    super(`Attestation challenge "${challengeId}" has expired.`);
    this.name = "ProviderNodeAttestationChallengeExpiredError";
  }
}

export class ProviderNodeAttestationChallengeAlreadyUsedError extends Error {
  public constructor(challengeId: string) {
    super(`Attestation challenge "${challengeId}" has already been used.`);
    this.name = "ProviderNodeAttestationChallengeAlreadyUsedError";
  }
}

export class ProviderNodeAttestationVerificationFailedError extends Error {
  public constructor(reason: string) {
    super(reason);
    this.name = "ProviderNodeAttestationVerificationFailedError";
  }
}

export class SubmitProviderNodeAttestationUseCase {
  public constructor(
    private readonly repository: ProviderNodeAttestationRepository,
    private readonly verifier: ProviderNodeAttestationVerifier,
    private readonly policy: ProviderNodeAttestationPolicy,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: SubmitProviderNodeAttestationRequest
  ): Promise<SubmitProviderNodeAttestationResponse> {
    const occurredAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const providerNodeId = ProviderNodeId.create(request.providerNodeId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderNodeAttestationOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderNodeAttestationCapabilityRequiredError();
    }

    const providerNode = await this.repository.findProviderNodeByOrganization(
      organizationId,
      providerNodeId
    );

    if (providerNode === null) {
      throw new ProviderNodeAttestationNodeNotFoundError(providerNodeId.value);
    }

    if (providerNode.runtime !== "linux") {
      throw new ProviderNodeAttestationRuntimeUnsupportedError(
        providerNode.runtime
      );
    }

    const challenge =
      await this.repository.findProviderNodeAttestationChallenge(
        providerNodeId,
        request.challengeId
      );

    if (challenge === null) {
      throw new ProviderNodeAttestationChallengeNotFoundError(
        request.challengeId
      );
    }

    if (challenge.isUsed()) {
      throw new ProviderNodeAttestationChallengeAlreadyUsedError(
        request.challengeId
      );
    }

    if (challenge.isExpired(occurredAt)) {
      throw new ProviderNodeAttestationChallengeExpiredError(
        request.challengeId
      );
    }

    const attestationType = parseProviderNodeAttestationType(
      request.attestationType
    );

    try {
      const verification = await this.verifier.verify({
        challenge,
        attestationType,
        attestationPublicKeyPem: request.attestationPublicKeyPem,
        quoteBase64: request.quoteBase64,
        pcrValues: request.pcrValues,
        secureBootEnabled: request.secureBootEnabled,
        verifiedAt: occurredAt
      });

      const consumed =
        await this.repository.markProviderNodeAttestationChallengeUsed(
          providerNodeId,
          request.challengeId,
          occurredAt
        );

      if (!consumed) {
        throw new ProviderNodeAttestationChallengeAlreadyUsedError(
          request.challengeId
        );
      }

      const expiresAt = new Date(
        occurredAt.getTime() + this.policy.freshnessHours * 60 * 60 * 1000
      );

      await this.repository.createProviderNodeAttestationRecord(
        ProviderNodeAttestationRecord.record({
          id: randomUUID(),
          providerNodeId: providerNodeId.value,
          challengeId: challenge.id,
          attestationType,
          attestationPublicKeyFingerprint:
            verification.attestationPublicKeyFingerprint,
          quotedAt: verification.quotedAt.toISOString(),
          secureBootEnabled: request.secureBootEnabled,
          pcrValues: request.pcrValues,
          verified: true,
          failureReason: null,
          recordedAt: occurredAt.toISOString(),
          expiresAt: expiresAt.toISOString()
        })
      );

      await this.auditLog.record({
        eventName: "provider.node.attestation.verified",
        occurredAt: occurredAt.toISOString(),
        actorUserId: organizationId.value,
        organizationId: organizationId.value,
        metadata: {
          providerNodeId: providerNodeId.value,
          challengeId: challenge.id,
          attestationType,
          attestationExpiresAt: expiresAt.toISOString()
        }
      });

      return {
        attestation: {
          status: "verified",
          effectiveTrustTier: "t2_attested",
          lastAttestedAt: occurredAt.toISOString(),
          attestationExpiresAt: expiresAt.toISOString(),
          attestationType
        }
      };
    } catch (error) {
      if (
        !(error instanceof ProviderNodeAttestationChallengeAlreadyUsedError)
      ) {
        await this.repository.createProviderNodeAttestationRecord(
          ProviderNodeAttestationRecord.record({
            id: randomUUID(),
            providerNodeId: providerNodeId.value,
            challengeId: challenge.id,
            attestationType,
            attestationPublicKeyFingerprint: "unverified",
            quotedAt: occurredAt.toISOString(),
            secureBootEnabled: request.secureBootEnabled,
            pcrValues: request.pcrValues,
            verified: false,
            failureReason:
              error instanceof Error ? error.message : "attestation_invalid",
            recordedAt: occurredAt.toISOString(),
            expiresAt: null
          })
        );
      }

      await this.auditLog.record({
        eventName: "provider.node.attestation.rejected",
        occurredAt: occurredAt.toISOString(),
        actorUserId: organizationId.value,
        organizationId: organizationId.value,
        metadata: {
          providerNodeId: providerNodeId.value,
          challengeId: challenge.id,
          attestationType,
          failureReason:
            error instanceof Error ? error.message : "attestation_invalid"
        }
      });

      if (error instanceof ProviderNodeAttestationChallengeAlreadyUsedError) {
        throw error;
      }

      throw new ProviderNodeAttestationVerificationFailedError(
        error instanceof Error ? error.message : "attestation_invalid"
      );
    }
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
