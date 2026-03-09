import type { SignedWorkloadBundleSnapshot } from "../../domain/workload/SignedWorkloadBundle.js";
import { SignedWorkloadBundle } from "../../domain/workload/SignedWorkloadBundle.js";
import type { GetProviderNodeDetailUseCase } from "./GetProviderNodeDetailUseCase.js";
import type { VerifySignedWorkloadBundleAdmissionUseCase } from "../workload/VerifySignedWorkloadBundleAdmissionUseCase.js";

export interface AdmitProviderRuntimeWorkloadBundleRequest {
  actorUserId: string;
  organizationId: string;
  environment: string;
  providerNodeId: string;
  expectedCustomerOrganizationId: string;
  signedBundle: SignedWorkloadBundleSnapshot;
}

export interface AdmitProviderRuntimeWorkloadBundleResponse {
  admission: {
    admitted: true;
    bundleId: string;
    manifestId: string;
    signatureKeyId: string;
    customerOrganizationId: string;
    providerNodeId: string;
    admittedAt: string;
  };
}

export class AdmitProviderRuntimeWorkloadBundleUseCase {
  public constructor(
    private readonly getProviderNodeDetailUseCase: Pick<
      GetProviderNodeDetailUseCase,
      "execute"
    >,
    private readonly verifySignedWorkloadBundleAdmissionUseCase: Pick<
      VerifySignedWorkloadBundleAdmissionUseCase,
      "execute"
    >
  ) {}

  public async execute(
    request: AdmitProviderRuntimeWorkloadBundleRequest
  ): Promise<AdmitProviderRuntimeWorkloadBundleResponse> {
    const providerNode = await this.getProviderNodeDetailUseCase.execute({
      organizationId: request.organizationId,
      providerNodeId: request.providerNodeId
    });
    const signedBundle = SignedWorkloadBundle.rehydrate(request.signedBundle);
    const verification =
      await this.verifySignedWorkloadBundleAdmissionUseCase.execute({
        actorUserId: request.actorUserId,
        auditOrganizationId: request.organizationId,
        environment: request.environment,
        providerNodeId: request.providerNodeId,
        expectedCustomerOrganizationId: request.expectedCustomerOrganizationId,
        signedBundle,
        providerNodeRuntime: providerNode.node.runtime
      });

    return {
      admission: {
        admitted: true,
        bundleId: verification.bundleId,
        manifestId: verification.manifestId,
        signatureKeyId: verification.signatureKeyId,
        customerOrganizationId: verification.customerOrganizationId,
        providerNodeId: request.providerNodeId,
        admittedAt: verification.verifiedAt
      }
    };
  }
}
