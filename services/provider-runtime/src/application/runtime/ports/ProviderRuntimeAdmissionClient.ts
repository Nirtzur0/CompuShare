export interface ProviderRuntimeAdmissionRequest {
  organizationId: string;
  environment: string;
  providerNodeId: string;
  expectedCustomerOrganizationId: string;
  signedBundle: {
    bundle: {
      id: string;
      modelManifestId: string;
      imageDigest: string;
      runtimeConfig: {
        requestKind: string;
        streamingEnabled: boolean;
        maxTokens: number;
        temperature: number | null;
        topP: number | null;
      };
      networkPolicy: string;
      maxRuntimeSeconds: number;
      customerOrganizationId: string;
      sensitivityClass: "standard_business";
      createdAt: string;
    };
    signature: string;
    signatureKeyId: string;
  };
}

export interface ProviderRuntimeAdmissionResponse {
  bundleId: string;
  manifestId: string;
  signatureKeyId: string;
  customerOrganizationId: string;
  providerNodeId: string;
  admittedAt: string;
}

export class ProviderRuntimeAdmissionRejectedError extends Error {
  public constructor(
    message = "The control-plane rejected runtime admission.",
  ) {
    super(message);
    this.name = "ProviderRuntimeAdmissionRejectedError";
  }
}

export class ProviderRuntimeAdmissionRequestError extends Error {
  public constructor(
    message = "The control-plane runtime admission request failed.",
  ) {
    super(message);
    this.name = "ProviderRuntimeAdmissionRequestError";
  }
}

export class ProviderRuntimeAdmissionResponseError extends Error {
  public constructor(
    message = "The control-plane runtime admission response was invalid.",
  ) {
    super(message);
    this.name = "ProviderRuntimeAdmissionResponseError";
  }
}

export interface ProviderRuntimeAdmissionClient {
  admitWorkloadBundle(
    request: ProviderRuntimeAdmissionRequest,
  ): Promise<ProviderRuntimeAdmissionResponse>;
}
