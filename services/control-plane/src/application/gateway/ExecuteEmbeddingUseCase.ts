import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import type { RecordGatewayUsageMeterEventUseCase } from "../metering/RecordGatewayUsageMeterEventUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../placement/ResolveSyncPlacementUseCase.js";
import type { ApprovedEmbeddingModelCatalog } from "./ports/ApprovedEmbeddingModelCatalog.js";
import type {
  GatewayEmbeddingRequest,
  GatewayEmbeddingResponse,
  GatewayUpstreamClient
} from "./ports/GatewayUpstreamClient.js";
import type { PrepareSignedEmbeddingWorkloadBundleUseCase } from "../workload/PrepareSignedEmbeddingWorkloadBundleUseCase.js";
import type { AuthenticatedGatewayExecutionContext } from "./ExecuteChatCompletionUseCase.js";
import { GatewayAuthorizationHeaderError } from "./ExecuteChatCompletionUseCase.js";
import type { GatewayUsageAdmissionUseCase } from "./GatewayUsageAdmissionUseCase.js";

export interface ExecuteEmbeddingRequest {
  authorizationHeader: string;
  request: GatewayEmbeddingRequest;
}

export type ExecuteEmbeddingResponse = GatewayEmbeddingResponse;

export class ApprovedEmbeddingModelNotFoundError extends Error {
  public constructor(alias: string) {
    super(`Approved embedding model alias "${alias}" was not found.`);
    this.name = "ApprovedEmbeddingModelNotFoundError";
  }
}

export class ExecuteEmbeddingUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly approvedEmbeddingModelCatalog: ApprovedEmbeddingModelCatalog,
    private readonly resolveSyncPlacementUseCase: ResolveSyncPlacementUseCase,
    private readonly prepareSignedEmbeddingWorkloadBundleUseCase: PrepareSignedEmbeddingWorkloadBundleUseCase,
    private readonly gatewayUpstreamClient: GatewayUpstreamClient,
    private readonly recordGatewayUsageMeterEventUseCase: RecordGatewayUsageMeterEventUseCase,
    private readonly auditLog: AuditLog,
    private readonly gatewayUsageAdmissionUseCase: Pick<
      GatewayUsageAdmissionUseCase,
      "admitEmbedding" | "settle" | "release"
    >,
    private readonly clock: () => Date = () => new Date(),
    private readonly latencyClock: () => number = () => performance.now()
  ) {}

  public async execute(
    request: ExecuteEmbeddingRequest
  ): Promise<ExecuteEmbeddingResponse> {
    const authentication = await this.authenticateGatewayApiKeyUseCase.execute({
      secret: this.parseAuthorizationHeader(request.authorizationHeader)
    });

    return this.executeAuthenticated({
      context: {
        organizationId: authentication.scope.organizationId,
        environment: authentication.scope.environment,
        apiKeyId: authentication.apiKey.id,
        issuedByUserId: authentication.apiKey.issuedByUserId
      },
      request: request.request
    });
  }

  public async executeAuthenticated(input: {
    context: AuthenticatedGatewayExecutionContext;
    request: GatewayEmbeddingRequest;
    requestSource?: "interactive" | "batch_worker";
  }): Promise<ExecuteEmbeddingResponse> {
    const manifest = this.approvedEmbeddingModelCatalog.findByAlias(
      input.request.model
    );

    if (manifest === null) {
      throw new ApprovedEmbeddingModelNotFoundError(input.request.model);
    }

    const admission = await this.gatewayUsageAdmissionUseCase.admitEmbedding({
      context: input.context,
      request: input.request,
      requestSource: input.requestSource ?? "interactive"
    });

    let admissionSettled = false;

    try {
      const placement = await this.resolveSyncPlacementUseCase.execute({
        organizationId: input.context.organizationId,
        environment: input.context.environment,
        approvedModelAlias: manifest.alias,
        ...manifest.placementRequirements.toSnapshot()
      });
      const signedBundle =
        await this.prepareSignedEmbeddingWorkloadBundleUseCase.execute({
          actorUserId: input.context.issuedByUserId,
          customerOrganizationId: input.context.organizationId,
          environment: input.context.environment,
          manifest,
          providerNodeId: placement.selection.providerNodeId,
          request: input.request
        });
      const upstreamRequestStartedAt = this.latencyClock();
      const response = await this.gatewayUpstreamClient.dispatchEmbedding({
        endpointUrl: this.resolveEmbeddingEndpointUrl(
          placement.selection.endpointUrl
        ),
        request: {
          ...input.request,
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

      await this.gatewayUsageAdmissionUseCase.settle({
        admissionId: admission.admissionId,
        actualTotalTokens: response.usage.total_tokens,
        settledAt: occurredAt
      });
      admissionSettled = true;

      await this.recordGatewayUsageMeterEventUseCase.execute({
        workloadBundleId: signedBundle.bundle.id,
        occurredAt: occurredAt.toISOString(),
        actorUserId: input.context.issuedByUserId,
        customerOrganizationId: input.context.organizationId,
        providerOrganizationId: placement.selection.providerOrganizationId,
        providerNodeId: placement.selection.providerNodeId,
        environment: input.context.environment,
        approvedModelAlias: manifest.alias,
        manifestId: manifest.manifestId,
        decisionLogId: placement.decisionLogId,
        requestKind: "embeddings",
        promptTokens: response.usage.prompt_tokens,
        completionTokens: 0,
        totalTokens: response.usage.total_tokens,
        latencyMs
      });

      await this.auditLog.record({
        eventName: "gateway.embedding.forwarded",
        occurredAt: occurredAt.toISOString(),
        actorUserId: input.context.issuedByUserId,
        organizationId: input.context.organizationId,
        metadata: {
          apiKeyId: input.context.apiKeyId,
          environment: input.context.environment,
          approvedModelAlias: manifest.alias,
          manifestId: manifest.manifestId,
          providerModelId: manifest.providerModelId,
          workloadBundleId: signedBundle.bundle.id,
          workloadSignatureKeyId: signedBundle.signatureKeyId,
          decisionLogId: placement.decisionLogId,
          providerNodeId: placement.selection.providerNodeId,
          providerOrganizationId: placement.selection.providerOrganizationId,
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
          latencyMs
        }
      });

      return {
        ...response,
        model: manifest.alias
      };
    } catch (error) {
      if (!admissionSettled) {
        await this.gatewayUsageAdmissionUseCase.release({
          admissionId: admission.admissionId,
          releaseReason: "request_failed"
        });
      }
      throw error;
    }
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

  private resolveEmbeddingEndpointUrl(chatEndpointUrl: string): string {
    const url = new URL(chatEndpointUrl);
    url.pathname = "/v1/embeddings";
    return url.toString();
  }
}
