import type { ApprovedChatModelManifest } from "../../domain/gateway/ApprovedChatModelManifest.js";
import type { SignedWorkloadBundle } from "../../domain/workload/SignedWorkloadBundle.js";
import { WorkloadBundle } from "../../domain/workload/WorkloadBundle.js";
import type { GatewayChatCompletionRequest } from "../gateway/ports/GatewayUpstreamClient.js";
import type { WorkloadBundleSignatureService } from "./ports/WorkloadBundleSignatureService.js";
import type { VerifySignedWorkloadBundleAdmissionUseCase } from "./VerifySignedWorkloadBundleAdmissionUseCase.js";

export interface PrepareSignedChatWorkloadBundleRequest {
  actorUserId: string;
  customerOrganizationId: string;
  environment: string;
  manifest: ApprovedChatModelManifest;
  providerNodeId: string;
  request: GatewayChatCompletionRequest;
}

export class PrepareSignedChatWorkloadBundleUseCase {
  public constructor(
    private readonly signatureService: WorkloadBundleSignatureService,
    private readonly verifySignedWorkloadBundleAdmissionUseCase: Pick<
      VerifySignedWorkloadBundleAdmissionUseCase,
      "execute"
    >,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: PrepareSignedChatWorkloadBundleRequest
  ): Promise<SignedWorkloadBundle> {
    const occurredAt = this.clock();
    const bundle = WorkloadBundle.issue({
      modelManifestId: request.manifest.manifestId,
      imageDigest: request.manifest.imageDigest,
      runtimeConfig: {
        requestKind: "chat.completions",
        streamingEnabled: false,
        maxTokens:
          request.request.max_tokens ?? request.manifest.maxTokensPerRequest,
        temperature: request.request.temperature ?? null,
        topP: request.request.top_p ?? null
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
