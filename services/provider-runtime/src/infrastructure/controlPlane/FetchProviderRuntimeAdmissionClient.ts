import { z } from "zod";
import {
  ProviderRuntimeAdmissionRejectedError,
  ProviderRuntimeAdmissionRequestError,
  ProviderRuntimeAdmissionResponseError,
  type ProviderRuntimeAdmissionClient,
  type ProviderRuntimeAdmissionRequest,
  type ProviderRuntimeAdmissionResponse,
} from "../../application/runtime/ports/ProviderRuntimeAdmissionClient.js";

const runtimeAdmissionResponseSchema = z.object({
  admission: z.object({
    admitted: z.literal(true),
    bundleId: z.uuid(),
    manifestId: z.string().min(3).max(120),
    signatureKeyId: z.string().min(3).max(120),
    customerOrganizationId: z.uuid(),
    providerNodeId: z.uuid(),
    admittedAt: z.iso.datetime(),
  }),
});

const controlPlaneErrorResponseSchema = z.looseObject({
  message: z.string().min(1).optional(),
});

export class FetchProviderRuntimeAdmissionClient implements ProviderRuntimeAdmissionClient {
  public constructor(
    private readonly controlPlaneBaseUrl: string,
    private readonly providerRuntimeApiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  public async admitWorkloadBundle(
    request: ProviderRuntimeAdmissionRequest,
  ): Promise<ProviderRuntimeAdmissionResponse> {
    const url = new URL(
      `/v1/organizations/${request.organizationId}/environments/${request.environment}/provider-nodes/${request.providerNodeId}/runtime-admissions`,
      this.controlPlaneBaseUrl,
    );
    let response: Response;

    try {
      response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.providerRuntimeApiKey,
        },
        body: JSON.stringify({
          expectedCustomerOrganizationId:
            request.expectedCustomerOrganizationId,
          signedBundle: request.signedBundle,
        }),
      });
    } catch (error) {
      throw new ProviderRuntimeAdmissionRequestError(
        error instanceof Error ? error.message : undefined,
      );
    }

    if (!response.ok) {
      const message = await this.readErrorMessage(response);

      if (response.status >= 400 && response.status < 500) {
        throw new ProviderRuntimeAdmissionRejectedError(message);
      }

      throw new ProviderRuntimeAdmissionRequestError(message);
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new ProviderRuntimeAdmissionResponseError(
        error instanceof Error ? error.message : undefined,
      );
    }

    const parsedPayload = runtimeAdmissionResponseSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ProviderRuntimeAdmissionResponseError(
        parsedPayload.error.issues[0]?.message,
      );
    }

    return parsedPayload.data.admission;
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload: unknown = await response.json();
      const parsedPayload = controlPlaneErrorResponseSchema.safeParse(payload);

      if (parsedPayload.success && parsedPayload.data.message !== undefined) {
        return parsedPayload.data.message;
      }
    } catch {
      return `Control-plane runtime admission returned HTTP ${String(response.status)}.`;
    }

    return `Control-plane runtime admission returned HTTP ${String(response.status)}.`;
  }
}
