import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import { GatewayFile } from "../../domain/batch/GatewayFile.js";
import type { GatewayBatchRepository } from "./ports/GatewayBatchRepository.js";

export class UploadGatewayFileUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly repository: GatewayBatchRepository,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(input: {
    authorizationHeader: string;
    purpose: "batch";
    filename: string;
    mediaType: string;
    bytes: number;
    content: string;
  }) {
    const authentication = await this.authenticateGatewayApiKeyUseCase.execute({
      secret: this.parseAuthorizationHeader(input.authorizationHeader)
    });
    const file = GatewayFile.upload({
      organizationId: authentication.scope.organizationId,
      environment: authentication.scope.environment,
      purpose: input.purpose,
      filename: input.filename,
      mediaType: input.mediaType,
      bytes: input.bytes,
      content: input.content,
      createdByUserId: authentication.apiKey.issuedByUserId,
      createdAt: this.clock()
    });

    await this.repository.createGatewayFile(file);

    return { file: file.toSnapshot() };
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
