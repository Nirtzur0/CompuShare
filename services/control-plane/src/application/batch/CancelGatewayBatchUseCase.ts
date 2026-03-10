import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import { GatewayBatchNotFoundError } from "./GetGatewayBatchUseCase.js";
import type { GatewayBatchRepository } from "./ports/GatewayBatchRepository.js";

export class CancelGatewayBatchUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly repository: GatewayBatchRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(input: {
    authorizationHeader: string;
    batchId: string;
  }) {
    const authentication = await this.authenticateGatewayApiKeyUseCase.execute({
      secret: this.parseAuthorizationHeader(input.authorizationHeader)
    });
    const batch = await this.repository.findGatewayBatchJobById(input.batchId);

    if (
      batch?.organizationId.value !== authentication.scope.organizationId ||
      batch.environment !== authentication.scope.environment
    ) {
      throw new GatewayBatchNotFoundError(input.batchId);
    }

    const occurredAt = this.clock().toISOString();
    const nextStatus =
      batch.status === "validating"
        ? "cancelled"
        : batch.status === "in_progress"
          ? "cancelling"
          : batch.status;

    if (nextStatus !== batch.status) {
      await this.repository.updateGatewayBatchStatus(
        nextStatus === "cancelled"
          ? {
              batchId: batch.id,
              status: nextStatus,
              completedAt: occurredAt
            }
          : {
              batchId: batch.id,
              status: nextStatus
            }
      );
      await this.auditLog.record({
        eventName: "gateway.batch.cancel_requested",
        occurredAt,
        actorUserId: authentication.apiKey.issuedByUserId,
        organizationId: authentication.scope.organizationId,
        metadata: {
          batchId: batch.id,
          previousStatus: batch.status,
          nextStatus
        }
      });
    }

    const updated = await this.repository.findGatewayBatchJobById(batch.id);
    return { batch: updated?.toSnapshot() ?? batch.toSnapshot() };
  }

  private parseAuthorizationHeader(headerValue: string): string {
    const trimmed = headerValue.trim();
    if (!trimmed.startsWith("Bearer ")) {
      throw new Error(
        "An Authorization: Bearer <org_api_key> header is required."
      );
    }
    return trimmed.slice("Bearer ".length).trim();
  }
}
