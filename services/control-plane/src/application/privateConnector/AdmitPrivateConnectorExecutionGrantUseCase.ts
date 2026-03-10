import {
  SignedPrivateConnectorExecutionGrant,
  type SignedPrivateConnectorExecutionGrantSnapshot
} from "../../domain/privateConnector/PrivateConnectorExecutionGrant.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { PrivateConnectorRepository } from "./ports/PrivateConnectorRepository.js";
import type { PrivateConnectorExecutionGrantSignatureService } from "./ports/PrivateConnectorExecutionGrantSignatureService.js";
import {
  PrivateConnectorEnvironmentMismatchError,
  PrivateConnectorNotFoundError
} from "./RecordPrivateConnectorCheckInUseCase.js";

export interface AdmitPrivateConnectorExecutionGrantRequest {
  actorUserId: string;
  organizationId: string;
  environment: "development" | "staging" | "production";
  connectorId: string;
  signedGrant: SignedPrivateConnectorExecutionGrantSnapshot;
}

export interface AdmitPrivateConnectorExecutionGrantResponse {
  admission: {
    admitted: true;
    grantId: string;
    connectorId: string;
    organizationId: string;
    upstreamModelId: string;
    admittedAt: string;
  };
}

export class PrivateConnectorExecutionGrantRejectedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PrivateConnectorExecutionGrantRejectedError";
  }
}

export class AdmitPrivateConnectorExecutionGrantUseCase {
  public constructor(
    private readonly repository: PrivateConnectorRepository,
    private readonly signatureService: PrivateConnectorExecutionGrantSignatureService,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: AdmitPrivateConnectorExecutionGrantRequest
  ): Promise<AdmitPrivateConnectorExecutionGrantResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const connector = await this.repository.findPrivateConnectorById(
      organizationId,
      request.connectorId
    );

    if (connector === null) {
      throw new PrivateConnectorNotFoundError(request.connectorId);
    }

    if (connector.environment !== request.environment) {
      throw new PrivateConnectorEnvironmentMismatchError();
    }

    const signedGrant = SignedPrivateConnectorExecutionGrant.rehydrate(
      request.signedGrant
    );
    const occurredAt = this.clock();
    const rejectionReason = this.getRejectionReason({
      signedGrant,
      connector,
      occurredAt
    });

    if (rejectionReason !== null) {
      await this.auditLog.record({
        eventName: "private_connector.runtime_admission.rejected",
        occurredAt: occurredAt.toISOString(),
        actorUserId: request.actorUserId,
        organizationId: organizationId.value,
        metadata: {
          connectorId: request.connectorId,
          grantId: signedGrant.grant.grantId,
          rejectionReason
        }
      });

      throw new PrivateConnectorExecutionGrantRejectedError(rejectionReason);
    }

    await this.auditLog.record({
      eventName: "private_connector.runtime_admission.accepted",
      occurredAt: occurredAt.toISOString(),
      actorUserId: request.actorUserId,
      organizationId: organizationId.value,
      metadata: {
        connectorId: connector.id,
        grantId: signedGrant.grant.grantId,
        upstreamModelId: signedGrant.grant.upstreamModelId
      }
    });

    return {
      admission: {
        admitted: true,
        grantId: signedGrant.grant.grantId,
        connectorId: connector.id,
        organizationId: signedGrant.grant.organizationId.value,
        upstreamModelId: signedGrant.grant.upstreamModelId,
        admittedAt: occurredAt.toISOString()
      }
    };
  }

  private getRejectionReason(input: {
    signedGrant: SignedPrivateConnectorExecutionGrant;
    connector: NonNullable<
      Awaited<ReturnType<PrivateConnectorRepository["findPrivateConnectorById"]>>
    >;
    occurredAt: Date;
  }): string | null {
    if (!this.signatureService.verify(input.signedGrant)) {
      return "signature_invalid";
    }

    if (input.signedGrant.grant.isExpired(input.occurredAt)) {
      return "grant_expired";
    }

    if (input.signedGrant.grant.organizationId.value !== input.connector.organizationId.value) {
      return "organization_mismatch";
    }

    if (input.signedGrant.grant.connectorId !== input.connector.id) {
      return "connector_mismatch";
    }

    if (input.signedGrant.grant.environment !== input.connector.environment) {
      return "environment_mismatch";
    }

    if (
      input.connector.findModelMapping(
        input.signedGrant.grant.requestModelAlias
      ) === null
    ) {
      return "model_alias_unconfigured";
    }

    return null;
  }
}
