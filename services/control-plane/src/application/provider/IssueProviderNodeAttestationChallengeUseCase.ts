import { randomBytes } from "node:crypto";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderNodeAttestationChallenge } from "../../domain/provider/ProviderNodeAttestationChallenge.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import type { ProviderRuntime } from "../../domain/provider/ProviderRuntime.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderNodeAttestationRepository } from "./ports/ProviderNodeAttestationRepository.js";
import type { ProviderNodeAttestationPolicy } from "../../config/ProviderNodeAttestationPolicy.js";

export interface IssueProviderNodeAttestationChallengeRequest {
  organizationId: string;
  providerNodeId: string;
}

export interface IssueProviderNodeAttestationChallengeResponse {
  challenge: {
    id: string;
    nonce: string;
    expiresAt: string;
  };
}

export class ProviderNodeAttestationOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderNodeAttestationOrganizationNotFoundError";
  }
}

export class ProviderNodeAttestationCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before managing node attestations."
    );
    this.name = "ProviderNodeAttestationCapabilityRequiredError";
  }
}

export class ProviderNodeAttestationNodeNotFoundError extends Error {
  public constructor(providerNodeId: string) {
    super(
      `Provider node "${providerNodeId}" was not found for this organization.`
    );
    this.name = "ProviderNodeAttestationNodeNotFoundError";
  }
}

export class ProviderNodeAttestationRuntimeUnsupportedError extends Error {
  public constructor(runtime: ProviderRuntime) {
    super(
      `Provider runtime "${runtime}" is not supported for TPM-backed attestation.`
    );
    this.name = "ProviderNodeAttestationRuntimeUnsupportedError";
  }
}

export class IssueProviderNodeAttestationChallengeUseCase {
  public constructor(
    private readonly repository: ProviderNodeAttestationRepository,
    private readonly policy: ProviderNodeAttestationPolicy,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly nonceFactory: () => string = () =>
      randomBytes(32).toString("base64url")
  ) {}

  public async execute(
    request: IssueProviderNodeAttestationChallengeRequest
  ): Promise<IssueProviderNodeAttestationChallengeResponse> {
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

    const expiresAt = new Date(
      occurredAt.getTime() + this.policy.challengeTtlMinutes * 60 * 1000
    );
    const challenge = ProviderNodeAttestationChallenge.issue({
      providerNodeId: providerNodeId.value,
      nonce: this.nonceFactory(),
      createdAt: occurredAt,
      expiresAt
    });

    await this.repository.createProviderNodeAttestationChallenge(challenge);
    await this.auditLog.record({
      eventName: "provider.node.attestation.challenge_issued",
      occurredAt: occurredAt.toISOString(),
      actorUserId: organizationId.value,
      organizationId: organizationId.value,
      metadata: {
        providerNodeId: providerNodeId.value,
        challengeId: challenge.id,
        challengeExpiresAt: expiresAt.toISOString()
      }
    });

    return {
      challenge: {
        id: challenge.id,
        nonce: challenge.nonce,
        expiresAt: expiresAt.toISOString()
      }
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
