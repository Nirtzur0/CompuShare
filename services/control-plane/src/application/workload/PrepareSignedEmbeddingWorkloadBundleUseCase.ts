import type { ApprovedEmbeddingModelManifest } from "../../domain/gateway/ApprovedEmbeddingModelManifest.js";
import type { SignedWorkloadBundle } from "../../domain/workload/SignedWorkloadBundle.js";
import { WorkloadBundle } from "../../domain/workload/WorkloadBundle.js";
import type { GatewayEmbeddingRequest } from "../gateway/ports/GatewayUpstreamClient.js";
import type { WorkloadBundleSignatureService } from "./ports/WorkloadBundleSignatureService.js";
import type { VerifySignedWorkloadBundleAdmissionUseCase } from "./VerifySignedWorkloadBundleAdmissionUseCase.js";

export interface PrepareSignedEmbeddingWorkloadBundleRequest {
  actorUserId: string;
  customerOrganizationId: string;
  environment: string;
  manifest: ApprovedEmbeddingModelManifest;
  providerNodeId: string;
  request: GatewayEmbeddingRequest;
}

export class PrepareSignedEmbeddingWorkloadBundleUseCase {
  public constructor(
    private readonly signatureService: WorkloadBundleSignatureService,
    private readonly verifySignedWorkloadBundleAdmissionUseCase: Pick<
      VerifySignedWorkloadBundleAdmissionUseCase,
      "execute"
    >,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: PrepareSignedEmbeddingWorkloadBundleRequest
  ): Promise<SignedWorkloadBundle> {
    const occurredAt = this.clock();
    const bundle = WorkloadBundle.issue({
      modelManifestId: request.manifest.manifestId,
      imageDigest: request.manifest.imageDigest,
      runtimeConfig: {
        requestKind: "embeddings",
        streamingEnabled: false,
        maxTokens: request.manifest.maxTokensPerRequest,
        temperature: null,
        topP: null
      },
      networkPolicy: request.manifest.networkPolicy,
      maxRuntimeSeconds: request.manifest.maxRuntimeSeconds,
      customerOrganizationId: request.customerOrganizationId,
      createdAt: occurredAt
    });
    const signedBundle = this.signatureService.sign(bundle);

    await this.verifySignedWorkloadBundleAdmissionUseCase.execute({
      actorUserId: request.actorUserId,
      auditOrganizationId: request.customerOrganizationId,
      environment: request.environment,
      providerNodeId: request.providerNodeId,
      expectedCustomerOrganizationId: request.customerOrganizationId,
      signedBundle,
      providerNodeRuntime: null
    });

    return signedBundle;
  }
}
