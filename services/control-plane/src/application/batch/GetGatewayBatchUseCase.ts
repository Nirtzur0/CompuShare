import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import type { GatewayBatchRepository } from "./ports/GatewayBatchRepository.js";

export class GatewayBatchNotFoundError extends Error {
  public constructor(batchId: string) {
    super(`Gateway batch "${batchId}" was not found.`);
    this.name = "GatewayBatchNotFoundError";
  }
}

export class GetGatewayBatchUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly repository: GatewayBatchRepository
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

    return { batch: batch.toSnapshot() };
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
