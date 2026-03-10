import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../../src/domain/identity/DomainValidationError.js";
import { PrivateConnector } from "../../../../src/domain/privateConnector/PrivateConnector.js";

describe("PrivateConnector", () => {
  it("creates connectors, resolves statuses, and finds model mappings", () => {
    const connector = PrivateConnector.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      environment: "development",
      label: "  Private cluster  ",
      mode: "cluster",
      endpointUrl:
        "http://127.0.0.1:4100/v1/private-connectors/chat/completions",
      modelMappings: [
        {
          requestModelAlias: " openai/gpt-oss-120b-like ",
          upstreamModelId: " gpt-oss-120b-instruct "
        }
      ],
      createdAt: new Date("2026-03-10T08:00:00.000Z")
    });

    expect(connector.label).toBe("Private cluster");
    expect(connector.endpointUrl).toBe(
      "http://127.0.0.1:4100/v1/private-connectors/chat/completions"
    );
    expect(
      connector.resolveStatus(new Date("2026-03-10T08:01:00.000Z"), 120_000)
    ).toBe("pending");
    expect(
      connector.findModelMapping("openai/gpt-oss-120b-like")?.toSnapshot()
    ).toEqual({
      requestModelAlias: "openai/gpt-oss-120b-like",
      upstreamModelId: "gpt-oss-120b-instruct"
    });

    const checkedIn = connector.registerCheckIn({
      occurredAt: new Date("2026-03-10T08:03:00.000Z"),
      runtimeVersion: " runtime-1 "
    });

    expect(
      checkedIn.resolveStatus(new Date("2026-03-10T08:04:00.000Z"), 120_000)
    ).toBe("ready");
    expect(
      checkedIn.resolveStatus(new Date("2026-03-10T08:06:01.000Z"), 120_000)
    ).toBe("stale");
    expect(checkedIn.runtimeVersion).toBe("runtime-1");

    const disabled = checkedIn.disable(new Date("2026-03-10T08:07:00.000Z"));

    expect(
      disabled.resolveStatus(new Date("2026-03-10T08:07:30.000Z"), 120_000)
    ).toBe("disabled");
    expect(disabled.toSnapshot()).toMatchObject({
      environment: "development",
      mode: "cluster",
      runtimeVersion: "runtime-1"
    });
  });

  it("supports non-development connector environments and modes", () => {
    const connector = PrivateConnector.rehydrate({
      id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      environment: "staging",
      label: "Staging connector",
      mode: "byok_api",
      endpointUrl:
        "https://connector.internal/v1/private-connectors/chat/completions",
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct"
        }
      ],
      runtimeVersion: null,
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      lastCheckInAt: null,
      lastReadyAt: null,
      disabledAt: null
    });

    expect(connector.environment).toBe("staging");
    expect(connector.mode).toBe("byok_api");
    expect(
      connector.resolveStatus(new Date("2026-03-10T08:01:00.000Z"), 120_000)
    ).toBe("pending");
  });

  it("rejects insecure endpoints, duplicate aliases, and invalid rehydration", () => {
    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Prod connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal/v1/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Duplicate aliases",
        mode: "cluster",
        endpointUrl: "https://connector.internal/v1/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          },
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-alt"
          }
        ],
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.rehydrate({
        id: "not-a-uuid",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Connector",
        mode: "cluster",
        endpointUrl: "https://connector.internal/v1/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        runtimeVersion: null,
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        lastCheckInAt: null,
        lastReadyAt: null,
        disabledAt: null
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "No mappings",
        mode: "cluster",
        endpointUrl: "https://connector.internal/v1/chat/completions",
        modelMappings: [],
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.rehydrate({
        id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Connector",
        mode: "byok_api",
        endpointUrl: "https://user:pass@connector.internal/v1/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        runtimeVersion: " ".repeat(121),
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        lastCheckInAt: null,
        lastReadyAt: null,
        disabledAt: null
      })
    ).toThrow(DomainValidationError);
  });

  it("rejects invalid aliases, upstream IDs, labels, modes, URLs, mapping counts, and runtime versions", () => {
    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Valid label",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "x",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Valid label",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "x"
          }
        ],
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.rehydrate({
        id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "production",
        label: "x",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        runtimeVersion: null,
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        lastCheckInAt: null,
        lastReadyAt: null,
        disabledAt: null
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.rehydrate({
        id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "production",
        label: "Connector",
        mode: "invalid",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        runtimeVersion: null,
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        lastCheckInAt: null,
        lastReadyAt: null,
        disabledAt: null
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Valid label",
        mode: "cluster",
        endpointUrl: "not-a-url",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        label: "Valid label",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: Array.from({ length: 65 }, (_, index) => ({
          requestModelAlias: `openai/gpt-oss-120b-like-${String(index)}`,
          upstreamModelId: `gpt-oss-120b-instruct-${String(index)}`
        })),
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      PrivateConnector.rehydrate({
        id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "production",
        label: "Connector",
        mode: "byok_api",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ],
        runtimeVersion: "x".repeat(121),
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        lastCheckInAt: null,
        lastReadyAt: null,
        disabledAt: null
      })
    ).toThrow(DomainValidationError);
  });
});
