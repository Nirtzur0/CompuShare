import { z } from "zod";
import type {
  PrivateConnectorControlPlaneClient,
  PrivateConnectorRuntimeAdmissionRequest,
  PrivateConnectorRuntimeAdmissionResponse,
  PrivateConnectorRuntimeCheckInRequest
} from "../../application/runtime/ports/PrivateConnectorControlPlaneClient.js";
import {
  PrivateConnectorControlPlaneRejectedError,
  PrivateConnectorControlPlaneRequestError,
  PrivateConnectorControlPlaneResponseError
} from "../../application/runtime/ports/PrivateConnectorControlPlaneClient.js";

const admissionResponseSchema = z.object({
  admission: z.object({
    admitted: z.literal(true),
    grantId: z.uuid(),
    connectorId: z.uuid(),
    organizationId: z.uuid(),
    upstreamModelId: z.string().min(3).max(160),
    admittedAt: z.iso.datetime()
  })
});

const errorResponseSchema = z.looseObject({
  message: z.string().min(1).optional()
});

export class FetchPrivateConnectorControlPlaneClient
  implements PrivateConnectorControlPlaneClient
{
  public constructor(
    private readonly controlPlaneBaseUrl: string,
    private readonly organizationApiKey: string,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  public async checkIn(
    request: PrivateConnectorRuntimeCheckInRequest
  ): Promise<void> {
    const url = new URL(
      `/v1/organizations/${request.organizationId}/environments/${request.environment}/private-connectors/${request.connectorId}/check-ins`,
      this.controlPlaneBaseUrl
    );

    await this.performRequest(url, {
      runtimeVersion: request.runtimeVersion
    });
  }

  public async admitExecutionGrant(
    request: PrivateConnectorRuntimeAdmissionRequest
  ): Promise<PrivateConnectorRuntimeAdmissionResponse> {
    const url = new URL(
      `/v1/organizations/${request.organizationId}/environments/${request.environment}/private-connectors/${request.connectorId}/runtime-admissions`,
      this.controlPlaneBaseUrl
    );
    const response = await this.performRequest(url, {
      signedGrant: request.signedGrant
    });
    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new PrivateConnectorControlPlaneResponseError(
        error instanceof Error ? error.message : undefined
      );
    }

    const parsedPayload = admissionResponseSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new PrivateConnectorControlPlaneResponseError(
        parsedPayload.error.issues[0]?.message
      );
    }

    return parsedPayload.data.admission;
  }

  private async performRequest(
    url: URL,
    body: Record<string, unknown>
  ): Promise<Response> {
    let response: Response;

    try {
      response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.organizationApiKey
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      throw new PrivateConnectorControlPlaneRequestError(
        error instanceof Error ? error.message : undefined
      );
    }

    if (!response.ok) {
      const message = await this.readErrorMessage(response);

      if (response.status >= 400 && response.status < 500) {
        throw new PrivateConnectorControlPlaneRejectedError(message);
      }

      throw new PrivateConnectorControlPlaneRequestError(message);
    }

    return response;
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload: unknown = await response.json();
      const parsedPayload = errorResponseSchema.safeParse(payload);

      if (parsedPayload.success && parsedPayload.data.message !== undefined) {
        return parsedPayload.data.message;
      }
    } catch {
      return `Control-plane private connector request returned HTTP ${String(response.status)}.`;
    }

    return `Control-plane private connector request returned HTTP ${String(response.status)}.`;
  }
}
