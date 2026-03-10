import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { PrivateConnectorSnapshot } from "../../domain/privateConnector/PrivateConnector.js";
import type { PrivateConnectorRepository } from "./ports/PrivateConnectorRepository.js";

export interface RecordPrivateConnectorCheckInRequest {
  organizationId: string;
  connectorId: string;
  environment: "development" | "staging" | "production";
  runtimeVersion: string | null;
  actorUserId: string;
}

export interface RecordPrivateConnectorCheckInResponse {
  connector: PrivateConnectorSnapshot;
  status: "pending" | "ready" | "stale" | "disabled";
}

export class PrivateConnectorNotFoundError extends Error {
  public constructor(connectorId: string) {
    super(`Private connector "${connectorId}" was not found.`);
    this.name = "PrivateConnectorNotFoundError";
  }
}

export class PrivateConnectorEnvironmentMismatchError extends Error {
  public constructor() {
    super("Private connector environment does not match the requested scope.");
    this.name = "PrivateConnectorEnvironmentMismatchError";
  }
}

export class RecordPrivateConnectorCheckInUseCase {
  public constructor(
    private readonly repository: PrivateConnectorRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly staleAfterMs = 2 * 60 * 1000
  ) {}

  public async execute(
    request: RecordPrivateConnectorCheckInRequest
  ): Promise<RecordPrivateConnectorCheckInResponse> {
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

    const updated = connector.registerCheckIn({
      occurredAt: this.clock(),
      runtimeVersion: request.runtimeVersion
    });
    await this.repository.savePrivateConnector(updated);
    const status = updated.resolveStatus(this.clock(), this.staleAfterMs);

    await this.auditLog.record({
      eventName: "private_connector.checked_in",
      occurredAt: updated.lastCheckInAt?.toISOString() ?? updated.createdAt.toISOString(),
      actorUserId: request.actorUserId,
      organizationId: organizationId.value,
      metadata: {
        connectorId: updated.id,
        environment: updated.environment,
        mode: updated.mode,
        runtimeVersion: updated.runtimeVersion,
        status
      }
    });

    return {
      connector: updated.toSnapshot(),
      status
    };
  }
}
