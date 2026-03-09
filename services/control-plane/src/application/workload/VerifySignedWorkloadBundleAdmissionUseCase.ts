import type { ApprovedChatModelCatalog } from "../gateway/ports/ApprovedChatModelCatalog.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderRuntime } from "../../domain/provider/ProviderRuntime.js";
import type { SignedWorkloadBundle } from "../../domain/workload/SignedWorkloadBundle.js";
import type { WorkloadBundleSignatureService } from "./ports/WorkloadBundleSignatureService.js";
import { WorkloadBundleAdmissionRejectedError } from "./WorkloadBundleAdmissionRejectedError.js";

export interface VerifySignedWorkloadBundleAdmissionRequest {
  actorUserId: string;
  auditOrganizationId: string;
  environment: string;
  providerNodeId: string;
  expectedCustomerOrganizationId: string;
  signedBundle: SignedWorkloadBundle;
  providerNodeRuntime?: ProviderRuntime | null;
}

export interface VerifySignedWorkloadBundleAdmissionResponse {
  admitted: true;
  bundleId: string;
  manifestId: string;
  signatureKeyId: string;
  customerOrganizationId: string;
  verifiedAt: string;
}

export class VerifySignedWorkloadBundleAdmissionUseCase {
  public constructor(
    private readonly signatureService: WorkloadBundleSignatureService,
    private readonly approvedChatModelCatalog: ApprovedChatModelCatalog,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: VerifySignedWorkloadBundleAdmissionRequest
  ): Promise<VerifySignedWorkloadBundleAdmissionResponse> {
    const occurredAt = this.clock();
    const manifest = this.approvedChatModelCatalog.findByManifestId(
      request.signedBundle.bundle.modelManifestId
    );
    const rejectionReason = this.getRejectionReason(
      request.signedBundle,
      request.expectedCustomerOrganizationId,
      manifest,
      request.providerNodeRuntime
    );

    if (rejectionReason !== null) {
      await this.auditLog.record({
        eventName: "workload_bundle.admission.rejected",
        occurredAt: occurredAt.toISOString(),
        actorUserId: request.actorUserId,
        organizationId: request.auditOrganizationId,
        metadata: {
          bundleId: request.signedBundle.bundle.id,
          manifestId: request.signedBundle.bundle.modelManifestId,
          signatureKeyId: request.signedBundle.signatureKeyId,
          customerOrganizationId:
            request.signedBundle.bundle.customerOrganizationId.value,
          providerNodeId: request.providerNodeId,
          environment: request.environment,
          rejectionReason
        }
      });

      throw new WorkloadBundleAdmissionRejectedError(rejectionReason);
    }

    await this.auditLog.record({
      eventName: "workload_bundle.admission.accepted",
      occurredAt: occurredAt.toISOString(),
      actorUserId: request.actorUserId,
      organizationId: request.auditOrganizationId,
      metadata: {
        bundleId: request.signedBundle.bundle.id,
        manifestId: request.signedBundle.bundle.modelManifestId,
        signatureKeyId: request.signedBundle.signatureKeyId,
        customerOrganizationId:
          request.signedBundle.bundle.customerOrganizationId.value,
        providerNodeId: request.providerNodeId,
        environment: request.environment
      }
    });

    return {
      admitted: true,
      bundleId: request.signedBundle.bundle.id,
      manifestId: request.signedBundle.bundle.modelManifestId,
      signatureKeyId: request.signedBundle.signatureKeyId,
      customerOrganizationId:
        request.signedBundle.bundle.customerOrganizationId.value,
      verifiedAt: occurredAt.toISOString()
    };
  }

  private getRejectionReason(
    signedBundle: SignedWorkloadBundle,
    expectedCustomerOrganizationId: string,
    manifest: ReturnType<ApprovedChatModelCatalog["findByManifestId"]> | null,
    providerNodeRuntime: ProviderRuntime | null | undefined
  ): string | null {
    if (manifest === null) {
      return "manifest_unapproved";
    }

    if (!this.signatureService.verify(signedBundle)) {
      return "signature_invalid";
    }

    if (
      signedBundle.bundle.customerOrganizationId.value !==
      expectedCustomerOrganizationId
    ) {
      return "customer_organization_mismatch";
    }

    if (signedBundle.bundle.imageDigest !== manifest.imageDigest) {
      return "image_digest_mismatch";
    }

    if (signedBundle.bundle.networkPolicy !== manifest.networkPolicy) {
      return "network_policy_mismatch";
    }

    if (
      signedBundle.bundle.runtimeConfig.maxTokens > manifest.maxTokensPerRequest
    ) {
      return "max_tokens_exceeds_manifest_policy";
    }

    if (signedBundle.bundle.maxRuntimeSeconds > manifest.maxRuntimeSeconds) {
      return "max_runtime_exceeds_manifest_policy";
    }

    if (
      providerNodeRuntime !== undefined &&
      providerNodeRuntime !== null &&
      !manifest.supportedNodeRuntimes.includes(providerNodeRuntime)
    ) {
      return "provider_runtime_unsupported";
    }

    return null;
  }
}
