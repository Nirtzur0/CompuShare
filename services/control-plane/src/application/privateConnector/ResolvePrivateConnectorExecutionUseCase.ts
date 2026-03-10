import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { PrivateConnectorExecutionGrant } from "../../domain/privateConnector/PrivateConnectorExecutionGrant.js";
import type { PrivateConnectorRepository } from "./ports/PrivateConnectorRepository.js";
import type { PrivateConnectorExecutionGrantSignatureService } from "./ports/PrivateConnectorExecutionGrantSignatureService.js";
import { PrivateConnectorNotFoundError } from "./RecordPrivateConnectorCheckInUseCase.js";

export interface ResolvePrivateConnectorExecutionRequest {
  organizationId: string;
  connectorId: string;
  environment: "development" | "staging" | "production";
  requestModelAlias: string;
  maxTokens: number;
}

export interface ResolvePrivateConnectorExecutionResponse {
  connector: {
    id: string;
    mode: "cluster" | "byok_api";
    endpointUrl: string;
  };
  grant: ReturnType<
    ReturnType<PrivateConnectorExecutionGrantSignatureService["sign"]>["toSnapshot"]
  >;
}

export class PrivateConnectorNotReadyError extends Error {
  public constructor(status: string) {
    super(`Private connector is not ready for execution: ${status}.`);
    this.name = "PrivateConnectorNotReadyError";
  }
}

export class PrivateConnectorModelAliasNotFoundError extends Error {
  public constructor(alias: string) {
    super(`Private connector model alias "${alias}" was not found.`);
    this.name = "PrivateConnectorModelAliasNotFoundError";
  }
}

export class ResolvePrivateConnectorExecutionUseCase {
  public constructor(
    private readonly repository: PrivateConnectorRepository,
    private readonly signatureService: PrivateConnectorExecutionGrantSignatureService,
    private readonly clock: () => Date = () => new Date(),
    private readonly staleAfterMs = 2 * 60 * 1000
  ) {}

  public async execute(
    request: ResolvePrivateConnectorExecutionRequest
  ): Promise<ResolvePrivateConnectorExecutionResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const connector = await this.repository.findPrivateConnectorById(
      organizationId,
      request.connectorId
    );

    if (connector === null) {
      throw new PrivateConnectorNotFoundError(request.connectorId);
    }

    if (connector.environment !== request.environment) {
      throw new PrivateConnectorNotReadyError("environment_mismatch");
    }

    const status = connector.resolveStatus(this.clock(), this.staleAfterMs);

    if (status !== "ready") {
      throw new PrivateConnectorNotReadyError(status);
    }

    const modelMapping = connector.findModelMapping(request.requestModelAlias);

    if (modelMapping === null) {
      throw new PrivateConnectorModelAliasNotFoundError(
        request.requestModelAlias
      );
    }

    const issuedAt = this.clock();
    const grant = this.signatureService.sign(
      PrivateConnectorExecutionGrant.issue({
        organizationId: organizationId.value,
        connectorId: connector.id,
        environment: connector.environment,
        requestModelAlias: modelMapping.requestModelAlias,
        upstreamModelId: modelMapping.upstreamModelId,
        maxTokens: request.maxTokens,
        issuedAt,
        expiresAt: new Date(issuedAt.getTime() + 5 * 60 * 1000)
      })
    );

    return {
      connector: {
        id: connector.id,
        mode: connector.mode,
        endpointUrl: connector.endpointUrl
      },
      grant: grant.toSnapshot()
    };
  }
}
