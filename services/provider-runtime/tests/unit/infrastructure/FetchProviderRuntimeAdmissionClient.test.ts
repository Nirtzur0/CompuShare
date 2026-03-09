import { describe, expect, it } from "vitest";
import {
  ProviderRuntimeAdmissionRejectedError,
  ProviderRuntimeAdmissionRequestError,
  ProviderRuntimeAdmissionResponseError,
} from "../../../src/application/runtime/ports/ProviderRuntimeAdmissionClient.js";
import { FetchProviderRuntimeAdmissionClient } from "../../../src/infrastructure/controlPlane/FetchProviderRuntimeAdmissionClient.js";

function createRequest() {
  return {
    organizationId: "eb1d6142-4bb1-47a7-9c91-214ca87a3671",
    environment: "development",
    providerNodeId: "3d9b113a-c299-44c6-9d19-486f8f47a4bb",
    expectedCustomerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
    signedBundle: {
      bundle: {
        id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 256,
          temperature: 0.2,
          topP: 0.9,
        },
        networkPolicy: "restricted-egress",
        maxRuntimeSeconds: 60,
        customerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
        sensitivityClass: "standard_business" as const,
        createdAt: "2026-03-16T10:00:00.000Z",
      },
      signature:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      signatureKeyId: "local-hmac-v1",
    },
  };
}

describe("FetchProviderRuntimeAdmissionClient", () => {
  it("wraps network failures as request errors", async () => {
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () => Promise.reject(new Error("socket hang up")),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionRequestError,
    );
    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      "socket hang up",
    );
  });

  it("uses the default request error message for non-error rejections", async () => {
    const nonErrorObject = {
      name: "Error",
      message: "socket hang up",
    } as Error;
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      (() => {
        throw nonErrorObject;
      }) as typeof fetch,
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionRequestError,
    );
    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      "The control-plane runtime admission request failed.",
    );
  });

  it("maps 4xx control-plane responses to rejection errors", async () => {
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              message: "Bundle drift detected.",
            }),
            {
              status: 403,
              headers: {
                "content-type": "application/json",
              },
            },
          ),
        ),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionRejectedError,
    );
    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      "Bundle drift detected.",
    );
  });

  it("uses the default 5xx message when the error payload is not readable", async () => {
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () =>
        Promise.resolve(
          new Response("this is not json", {
            status: 502,
            headers: {
              "content-type": "text/plain",
            },
          }),
        ),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionRequestError,
    );
    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      "Control-plane runtime admission returned HTTP 502.",
    );
  });

  it("uses the default 5xx message when the error payload has no message field", async () => {
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "UNAVAILABLE" }), {
            status: 503,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionRequestError,
    );
    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      "Control-plane runtime admission returned HTTP 503.",
    );
  });

  it("rejects invalid json success payloads", async () => {
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () =>
        Promise.resolve(
          new Response("not-json", {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionResponseError,
    );
  });

  it("uses the default response error message for non-error json failures", async () => {
    const nonErrorObject = {
      name: "Error",
      message: "invalid json payload",
    } as Error;
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => {
            throw nonErrorObject;
          },
        } as unknown as Response),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionResponseError,
    );
    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      "The control-plane runtime admission response was invalid.",
    );
  });

  it("rejects schema-invalid success payloads", async () => {
    const client = new FetchProviderRuntimeAdmissionClient(
      "http://127.0.0.1:3100",
      "csk_provider_runtime_local_seed_secret_000000",
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              admission: {
                admitted: true,
              },
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
              },
            },
          ),
        ),
    );

    await expect(client.admitWorkloadBundle(createRequest())).rejects.toThrow(
      ProviderRuntimeAdmissionResponseError,
    );
  });
});
