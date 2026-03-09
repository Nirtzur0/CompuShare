import type { AuditLog } from "../identity/ports/AuditLog.js";
import {
  type GatewayChatCompletionRequest,
  type GatewayChatCompletionResponse,
  type GatewayUpstreamClient
} from "./ports/GatewayUpstreamClient.js";
import type { PrepareSignedChatWorkloadBundleUseCase } from "../workload/PrepareSignedChatWorkloadBundleUseCase.js";
import type { ApprovedChatModelCatalog } from "./ports/ApprovedChatModelCatalog.js";
import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../placement/ResolveSyncPlacementUseCase.js";
import type { RecordGatewayUsageMeterEventUseCase } from "../metering/RecordGatewayUsageMeterEventUseCase.js";

export interface ExecuteChatCompletionRequest {
  authorizationHeader: string;
  request: GatewayChatCompletionRequest;
}

export type ExecuteChatCompletionResponse = GatewayChatCompletionResponse;

export class GatewayAuthorizationHeaderError extends Error {
  public constructor() {
    super("An Authorization: Bearer <org_api_key> header is required.");
    this.name = "GatewayAuthorizationHeaderError";
  }
}

export class ApprovedChatModelNotFoundError extends Error {
  public constructor(alias: string) {
    super(`Approved chat model alias "${alias}" was not found.`);
    this.name = "ApprovedChatModelNotFoundError";
  }
}

export class ExecuteChatCompletionUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly approvedChatModelCatalog: ApprovedChatModelCatalog,
    private readonly resolveSyncPlacementUseCase: ResolveSyncPlacementUseCase,
    private readonly prepareSignedChatWorkloadBundleUseCase: PrepareSignedChatWorkloadBundleUseCase,
    private readonly gatewayUpstreamClient: GatewayUpstreamClient,
    private readonly recordGatewayUsageMeterEventUseCase: RecordGatewayUsageMeterEventUseCase,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly latencyClock: () => number = () => performance.now()
  ) {}

  public async execute(
    request: ExecuteChatCompletionRequest
  ): Promise<ExecuteChatCompletionResponse> {
    const apiKeySecret = this.parseAuthorizationHeader(
      request.authorizationHeader
    );
    const authentication = await this.authenticateGatewayApiKeyUseCase.execute({
      secret: apiKeySecret
    });
    const manifest = this.approvedChatModelCatalog.findByAlias(
      request.request.model
    );

    if (manifest === null) {
      throw new ApprovedChatModelNotFoundError(request.request.model);
    }

    const placement = await this.resolveSyncPlacementUseCase.execute({
      organizationId: authentication.scope.organizationId,
      environment: authentication.scope.environment,
      ...manifest.placementRequirements.toSnapshot()
    });
    const signedBundle =
      await this.prepareSignedChatWorkloadBundleUseCase.execute({
        actorUserId: authentication.apiKey.issuedByUserId,
        customerOrganizationId: authentication.scope.organizationId,
        environment: authentication.scope.environment,
        manifest,
        providerNodeId: placement.selection.providerNodeId,
        request: request.request
      });
    const upstreamRequestStartedAt = this.latencyClock();
    const response = await this.gatewayUpstreamClient.dispatchChatCompletion({
      endpointUrl: placement.selection.endpointUrl,
      request: {
        ...request.request,
        model: manifest.providerModelId
      },
      headers: {
        "x-compushare-workload-bundle": Buffer.from(
          JSON.stringify(signedBundle.bundle.toSnapshot()),
          "utf8"
        ).toString("base64url"),
        "x-compushare-workload-signature": signedBundle.signature,
        "x-compushare-workload-signature-key-id": signedBundle.signatureKeyId
      }
    });
    const occurredAt = this.clock();
    const latencyMs = Math.max(
      0,
      Math.round(this.latencyClock() - upstreamRequestStartedAt)
    );

    await this.recordGatewayUsageMeterEventUseCase.execute({
      workloadBundleId: signedBundle.bundle.id,
      occurredAt: occurredAt.toISOString(),
      actorUserId: authentication.apiKey.issuedByUserId,
      customerOrganizationId: authentication.scope.organizationId,
      providerOrganizationId: placement.selection.providerOrganizationId,
      providerNodeId: placement.selection.providerNodeId,
      environment: authentication.scope.environment,
      approvedModelAlias: manifest.alias,
      manifestId: manifest.manifestId,
      decisionLogId: placement.decisionLogId,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      latencyMs
    });

    await this.auditLog.record({
      eventName: "gateway.chat_completion.forwarded",
      occurredAt: occurredAt.toISOString(),
      actorUserId: authentication.apiKey.issuedByUserId,
      organizationId: authentication.scope.organizationId,
      metadata: {
        apiKeyId: authentication.apiKey.id,
        environment: authentication.scope.environment,
        approvedModelAlias: manifest.alias,
        manifestId: manifest.manifestId,
        providerModelId: manifest.providerModelId,
        workloadBundleId: signedBundle.bundle.id,
        workloadSignatureKeyId: signedBundle.signatureKeyId,
        decisionLogId: placement.decisionLogId,
        providerNodeId: placement.selection.providerNodeId,
        providerOrganizationId: placement.selection.providerOrganizationId,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        latencyMs
      }
    });

    return {
      ...response,
      model: manifest.alias
    };
  }

  private parseAuthorizationHeader(headerValue: string): string {
    const trimmed = headerValue.trim();

    if (!trimmed.startsWith("Bearer ")) {
      throw new GatewayAuthorizationHeaderError();
    }

    const secret = trimmed.slice("Bearer ".length).trim();

    if (secret.length === 0) {
      throw new GatewayAuthorizationHeaderError();
    }

    return secret;
  }
}
