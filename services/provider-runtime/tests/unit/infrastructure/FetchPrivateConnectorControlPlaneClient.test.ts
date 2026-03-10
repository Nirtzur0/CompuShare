import { describe, expect, it, vi } from "vitest";
import {
  PrivateConnectorControlPlaneRejectedError,
  PrivateConnectorControlPlaneRequestError,
  PrivateConnectorControlPlaneResponseError,
} from "../../../src/application/runtime/ports/PrivateConnectorControlPlaneClient.js";
import { FetchPrivateConnectorControlPlaneClient } from "../../../src/infrastructure/controlPlane/FetchPrivateConnectorControlPlaneClient.js";

describe("FetchPrivateConnectorControlPlaneClient", () => {
  it("posts connector check-ins to the control-plane", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    );
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      fetchMock,
    );

    await expect(
      client.checkIn({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        runtimeVersion: "runtime-1",
      }),
    ).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect((url as URL).href).toContain("/check-ins");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "x-api-key": "csk_private_connector_runtime_secret_000000",
      },
    });
  });

  it("returns runtime admissions from the control-plane", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            admission: {
              admitted: true,
              grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
              connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              upstreamModelId: "gpt-oss-120b-instruct",
              admittedAt: "2026-03-10T10:00:00.000Z",
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
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      fetchMock,
    );

    await expect(
      client.admitExecutionGrant({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        signedGrant: {
          grant: {
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z",
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).resolves.toMatchObject({
      connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      upstreamModelId: "gpt-oss-120b-instruct",
    });
  });

  it("maps 4xx control-plane responses to rejected errors", async () => {
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "signature_invalid" }), {
            status: 403,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      ),
    );

    await expect(
      client.checkIn({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        runtimeVersion: null,
      }),
    ).rejects.toThrow(PrivateConnectorControlPlaneRejectedError);
  });

  it("maps invalid admission payloads to response errors", async () => {
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(JSON.stringify({ wrong: true }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      ),
    );

    await expect(
      client.admitExecutionGrant({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        signedGrant: {
          grant: {
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z",
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorControlPlaneResponseError);
  });

  it("maps non-json admission payloads to response errors", async () => {
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response("not-json", {
            status: 200,
            headers: {
              "content-type": "text/plain",
            },
          }),
        ),
      ),
    );

    await expect(
      client.admitExecutionGrant({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        signedGrant: {
          grant: {
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z",
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorControlPlaneResponseError);
  });

  it("maps 5xx control-plane responses to request errors", async () => {
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response("boom", {
            status: 503,
            headers: {
              "content-type": "text/plain",
            },
          }),
        ),
      ),
    );

    await expect(
      client.checkIn({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        runtimeVersion: null,
      }),
    ).rejects.toThrow(PrivateConnectorControlPlaneRequestError);
  });

  it("falls back to a generic error message when 4xx responses omit message fields", async () => {
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(JSON.stringify({ wrong: true }), {
            status: 400,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      ),
    );

    await expect(
      client.checkIn({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        runtimeVersion: null,
      }),
    ).rejects.toThrow(
      "Control-plane private connector request returned HTTP 400.",
    );
  });

  it("maps transport failures to request errors", async () => {
    const client = new FetchPrivateConnectorControlPlaneClient(
      "http://127.0.0.1:3100",
      "csk_private_connector_runtime_secret_000000",
      vi.fn<typeof fetch>(() => Promise.reject(new Error("offline"))),
    );

    await expect(
      client.checkIn({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        runtimeVersion: null,
      }),
    ).rejects.toThrow(PrivateConnectorControlPlaneRequestError);
  });
});
