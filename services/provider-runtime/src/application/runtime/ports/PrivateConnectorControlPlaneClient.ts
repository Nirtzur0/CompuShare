export interface PrivateConnectorRuntimeCheckInRequest {
  organizationId: string;
  environment: "development" | "staging" | "production";
  connectorId: string;
  runtimeVersion: string | null;
}

export interface PrivateConnectorRuntimeAdmissionRequest {
  organizationId: string;
  environment: "development" | "staging" | "production";
  connectorId: string;
  signedGrant: {
    grant: {
      grantId: string;
      organizationId: string;
      connectorId: string;
      environment: "development" | "staging" | "production";
      requestKind: "chat.completions";
      requestModelAlias: string;
      upstreamModelId: string;
      maxTokens: number;
      issuedAt: string;
      expiresAt: string;
    };
    signature: string;
    signatureKeyId: string;
  };
}

export interface PrivateConnectorRuntimeAdmissionResponse {
  grantId: string;
  connectorId: string;
  organizationId: string;
  upstreamModelId: string;
  admittedAt: string;
}

export class PrivateConnectorControlPlaneRequestError extends Error {
  public constructor(message = "The private connector request to the control-plane failed.") {
    super(message);
    this.name = "PrivateConnectorControlPlaneRequestError";
  }
}

export class PrivateConnectorControlPlaneRejectedError extends Error {
  public constructor(message = "The control-plane rejected private connector execution.") {
    super(message);
    this.name = "PrivateConnectorControlPlaneRejectedError";
  }
}

export class PrivateConnectorControlPlaneResponseError extends Error {
  public constructor(message = "The control-plane private connector response was invalid.") {
    super(message);
    this.name = "PrivateConnectorControlPlaneResponseError";
  }
}

export interface PrivateConnectorControlPlaneClient {
  checkIn(request: PrivateConnectorRuntimeCheckInRequest): Promise<void>;
  admitExecutionGrant(
    request: PrivateConnectorRuntimeAdmissionRequest
  ): Promise<PrivateConnectorRuntimeAdmissionResponse>;
}
