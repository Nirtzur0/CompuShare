import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import type { GatewayBatchRepository } from "./ports/GatewayBatchRepository.js";

export class GatewayFileNotFoundError extends Error {
  public constructor(fileId: string) {
    super(`Gateway file "${fileId}" was not found.`);
    this.name = "GatewayFileNotFoundError";
  }
}

export class GetGatewayFileUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly repository: GatewayBatchRepository
  ) {}

  public async execute(input: { authorizationHeader: string; fileId: string }) {
    const authentication = await this.authenticateGatewayApiKeyUseCase.execute({
      secret: this.parseAuthorizationHeader(input.authorizationHeader)
    });
    const file = await this.repository.findGatewayFileById(input.fileId);

    if (
      file?.organizationId.value !== authentication.scope.organizationId ||
      file.environment !== authentication.scope.environment
    ) {
      throw new GatewayFileNotFoundError(input.fileId);
    }

    return {
      file: file.toSnapshot(),
      content: file.content
    };
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
