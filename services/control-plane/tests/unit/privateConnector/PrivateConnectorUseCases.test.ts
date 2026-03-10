import { describe, expect, it, vi } from "vitest";
import {
  CreatePrivateConnectorUseCase,
  PrivateConnectorAuthorizationError,
  PrivateConnectorBuyerCapabilityRequiredError,
  PrivateConnectorOrganizationNotFoundError
} from "../../../src/application/privateConnector/CreatePrivateConnectorUseCase.js";
import { ListPrivateConnectorsUseCase } from "../../../src/application/privateConnector/ListPrivateConnectorsUseCase.js";
import {
  RecordPrivateConnectorCheckInUseCase,
  PrivateConnectorEnvironmentMismatchError,
  PrivateConnectorNotFoundError
} from "../../../src/application/privateConnector/RecordPrivateConnectorCheckInUseCase.js";
import {
  ResolvePrivateConnectorExecutionUseCase,
  PrivateConnectorModelAliasNotFoundError,
  PrivateConnectorNotReadyError
} from "../../../src/application/privateConnector/ResolvePrivateConnectorExecutionUseCase.js";
import {
  AdmitPrivateConnectorExecutionGrantUseCase,
  PrivateConnectorExecutionGrantRejectedError
} from "../../../src/application/privateConnector/AdmitPrivateConnectorExecutionGrantUseCase.js";
import type { PrivateConnectorRepository } from "../../../src/application/privateConnector/ports/PrivateConnectorRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationRole } from "../../../src/domain/identity/OrganizationRole.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { PrivateConnector } from "../../../src/domain/privateConnector/PrivateConnector.js";
import { PrivateConnectorExecutionGrant } from "../../../src/domain/privateConnector/PrivateConnectorExecutionGrant.js";
import { HmacPrivateConnectorExecutionGrantSignatureService } from "../../../src/infrastructure/security/HmacPrivateConnectorExecutionGrantSignatureService.js";

function createConnector(input?: {
  id?: string;
  organizationId?: string;
  environment?: "development" | "staging" | "production";
  mode?: "cluster" | "byok_api";
  runtimeVersion?: string | null;
  lastCheckInAt?: Date | null;
  lastReadyAt?: Date | null;
  disabledAt?: Date | null;
  aliases?: { requestModelAlias: string; upstreamModelId: string }[];
}): PrivateConnector {
  return PrivateConnector.rehydrate({
    id: input?.id ?? "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
    organizationId:
      input?.organizationId ?? "87057cb0-e0ca-4095-9f25-dd8103408b18",
    environment: input?.environment ?? "development",
    label: "Primary connector",
    mode: input?.mode ?? "cluster",
    endpointUrl:
      "https://connector.internal/v1/private-connectors/chat/completions",
    modelMappings: input?.aliases ?? [
      {
        requestModelAlias: "openai/gpt-oss-120b-like",
        upstreamModelId: "gpt-oss-120b-instruct"
      }
    ],
    runtimeVersion: input?.runtimeVersion ?? null,
    createdAt: new Date("2026-03-10T09:00:00.000Z"),
    lastCheckInAt: input?.lastCheckInAt ?? null,
    lastReadyAt: input?.lastReadyAt ?? null,
    disabledAt: input?.disabledAt ?? null
  });
}

function createRepository(input?: {
  capabilities?: readonly AccountCapability[] | null;
  role?: OrganizationRole;
  connectors?: readonly PrivateConnector[];
}): PrivateConnectorRepository {
  const connectors = [...(input?.connectors ?? [])];

  return {
    findOrganizationAccountCapabilities: vi.fn(() =>
      Promise.resolve(
        input?.capabilities === undefined
          ? (["buyer"] as const)
          : input.capabilities
      )
    ),
    findOrganizationMember: vi.fn(() =>
      Promise.resolve(
        OrganizationMember.rehydrate({
          userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
          role: input?.role ?? "finance",
          joinedAt: new Date("2026-03-10T09:00:00.000Z")
        })
      )
    ),
    createPrivateConnector: vi.fn((connector: PrivateConnector) => {
      connectors.push(connector);
      return Promise.resolve(undefined);
    }),
    listPrivateConnectors: vi.fn((_organizationId, environment) =>
      Promise.resolve(
        environment === undefined
          ? connectors
          : connectors.filter(
              (connector) => connector.environment === environment
            )
      )
    ),
    findPrivateConnectorById: vi.fn((_organizationId, connectorId) =>
      Promise.resolve(
        connectors.find((connector) => connector.id === connectorId) ?? null
      )
    ),
    savePrivateConnector: vi.fn((nextConnector: PrivateConnector) => {
      const index = connectors.findIndex(
        (connector) => connector.id === nextConnector.id
      );

      if (index >= 0) {
        connectors[index] = nextConnector;
      }

      return Promise.resolve(undefined);
    })
  };
}

describe("Private connector use cases", () => {
  it("creates connectors and records the creation audit event", async () => {
    const repository = createRepository();
    const auditLog = {
      record: vi.fn(() => Promise.resolve(undefined))
    };
    const useCase = new CreatePrivateConnectorUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "development",
      label: "Buyer cluster",
      mode: "cluster",
      endpointUrl:
        "https://connector.internal/v1/private-connectors/chat/completions",
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct"
        }
      ]
    });

    expect(response.connector).toMatchObject({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      label: "Buyer cluster",
      mode: "cluster"
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "private_connector.created",
        metadata: {
          connectorId: response.connector.id,
          environment: "development",
          mode: "cluster",
          modelMappingCount: 1
        }
      })
    );
  });

  it("rejects missing organizations, missing buyer capability, and unauthorized roles", async () => {
    const auditLog = { record: vi.fn(() => Promise.resolve(undefined)) };

    await expect(
      new CreatePrivateConnectorUseCase(
        createRepository({ capabilities: null }),
        auditLog
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Buyer cluster",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      })
    ).rejects.toBeInstanceOf(PrivateConnectorOrganizationNotFoundError);

    await expect(
      new CreatePrivateConnectorUseCase(
        createRepository({ capabilities: ["provider"] }),
        auditLog
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Buyer cluster",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      })
    ).rejects.toBeInstanceOf(PrivateConnectorBuyerCapabilityRequiredError);

    await expect(
      new CreatePrivateConnectorUseCase(
        createRepository({ role: "developer" }),
        auditLog
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development",
        label: "Buyer cluster",
        mode: "cluster",
        endpointUrl:
          "https://connector.internal/v1/private-connectors/chat/completions",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct"
          }
        ]
      })
    ).rejects.toBeInstanceOf(PrivateConnectorAuthorizationError);
  });

  it("lists connectors with derived statuses and filtered environments", async () => {
    const readyConnector = createConnector({
      lastCheckInAt: new Date("2026-03-10T10:00:00.000Z"),
      lastReadyAt: new Date("2026-03-10T10:00:00.000Z")
    });
    const staleConnector = createConnector({
      id: "e5e34b83-f1f5-4bd3-a862-c225c9d4a173",
      environment: "staging",
      lastCheckInAt: new Date("2026-03-10T09:30:00.000Z"),
      lastReadyAt: new Date("2026-03-10T09:30:00.000Z")
    });
    const useCase = new ListPrivateConnectorsUseCase(
      createRepository({ connectors: [readyConnector, staleConnector] }),
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.actorRole).toBe("finance");
    expect(response.connectors).toHaveLength(2);
    expect(response.connectors.map((connector) => connector.status)).toEqual([
      "ready",
      "stale"
    ]);

    const filtered = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "staging"
    });

    expect(filtered.connectors).toHaveLength(1);
    expect(filtered.connectors[0]?.connector.id).toBe(staleConnector.id);
  });

  it("rejects list requests when buyer access or finance permissions are missing", async () => {
    await expect(
      new ListPrivateConnectorsUseCase(
        createRepository({ capabilities: null })
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorOrganizationNotFoundError);

    await expect(
      new ListPrivateConnectorsUseCase(
        createRepository({ capabilities: ["provider"] })
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorBuyerCapabilityRequiredError);

    await expect(
      new ListPrivateConnectorsUseCase(
        createRepository({ role: "developer" })
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorAuthorizationError);
  });

  it("records connector check-ins and rejects missing or mismatched connectors", async () => {
    const connector = createConnector();
    const repository = createRepository({ connectors: [connector] });
    const auditLog = { record: vi.fn(() => Promise.resolve(undefined)) };
    const useCase = new RecordPrivateConnectorCheckInUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      connectorId: connector.id,
      environment: "development",
      runtimeVersion: "runtime-2",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.status).toBe("ready");
    expect(response.connector.runtimeVersion).toBe("runtime-2");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "private_connector.checked_in",
        metadata: {
          connectorId: connector.id,
          environment: "development",
          mode: "cluster",
          status: "ready",
          runtimeVersion: "runtime-2"
        }
      })
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: "f8dbf622-4ed3-4ef8-b88e-594354ba6c1d",
        environment: "development",
        runtimeVersion: null,
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorNotFoundError);

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: connector.id,
        environment: "production",
        runtimeVersion: null,
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorEnvironmentMismatchError);
  });

  it("resolves ready private connector executions and rejects stale or unknown aliases", async () => {
    const connector = createConnector({
      lastCheckInAt: new Date("2026-03-10T10:00:00.000Z"),
      lastReadyAt: new Date("2026-03-10T10:00:00.000Z"),
      mode: "byok_api"
    });
    const signatureService =
      new HmacPrivateConnectorExecutionGrantSignatureService(
        "private-connector-secret",
        "local-hmac-v1"
      );
    const useCase = new ResolvePrivateConnectorExecutionUseCase(
      createRepository({ connectors: [connector] }),
      signatureService,
      () => new Date("2026-03-10T10:01:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      connectorId: connector.id,
      environment: "development",
      requestModelAlias: "openai/gpt-oss-120b-like",
      maxTokens: 4096
    });

    expect(response.connector).toMatchObject({
      id: connector.id,
      mode: "byok_api"
    });
    expect(response.grant.grant.upstreamModelId).toBe("gpt-oss-120b-instruct");

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: connector.id,
        environment: "development",
        requestModelAlias: "missing-alias",
        maxTokens: 4096
      })
    ).rejects.toBeInstanceOf(PrivateConnectorModelAliasNotFoundError);

    const staleUseCase = new ResolvePrivateConnectorExecutionUseCase(
      createRepository({
        connectors: [
          createConnector({
            lastCheckInAt: new Date("2026-03-10T09:57:00.000Z"),
            lastReadyAt: new Date("2026-03-10T09:57:00.000Z")
          })
        ]
      }),
      signatureService,
      () => new Date("2026-03-10T10:01:00.000Z")
    );

    await expect(
      staleUseCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: connector.id,
        environment: "development",
        requestModelAlias: "openai/gpt-oss-120b-like",
        maxTokens: 4096
      })
    ).rejects.toBeInstanceOf(PrivateConnectorNotReadyError);

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: connector.id,
        environment: "production",
        requestModelAlias: "openai/gpt-oss-120b-like",
        maxTokens: 4096
      })
    ).rejects.toBeInstanceOf(PrivateConnectorNotReadyError);

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        connectorId: "f8dbf622-4ed3-4ef8-b88e-594354ba6c1d",
        environment: "development",
        requestModelAlias: "openai/gpt-oss-120b-like",
        maxTokens: 4096
      })
    ).rejects.toBeInstanceOf(PrivateConnectorNotFoundError);
  });

  it("admits valid signed grants and rejects invalid signatures or connector mismatches", async () => {
    const connector = createConnector({
      lastCheckInAt: new Date("2026-03-10T10:00:00.000Z"),
      lastReadyAt: new Date("2026-03-10T10:00:00.000Z")
    });
    const repository = createRepository({ connectors: [connector] });
    const signatureService =
      new HmacPrivateConnectorExecutionGrantSignatureService(
        "private-connector-secret",
        "local-hmac-v1"
      );
    const auditLog = { record: vi.fn(() => Promise.resolve(undefined)) };
    const issuedAt = new Date("2026-03-10T10:00:00.000Z");
    const signedGrant = signatureService.sign(
      PrivateConnectorExecutionGrant.issue({
        organizationId: connector.organizationId.value,
        connectorId: connector.id,
        environment: connector.environment,
        requestModelAlias: "openai/gpt-oss-120b-like",
        upstreamModelId: "gpt-oss-120b-instruct",
        maxTokens: 4096,
        issuedAt,
        expiresAt: new Date("2026-03-10T10:04:00.000Z")
      })
    );
    const useCase = new AdmitPrivateConnectorExecutionGrantUseCase(
      repository,
      signatureService,
      auditLog,
      () => new Date("2026-03-10T10:01:00.000Z")
    );

    const response = await useCase.execute({
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      organizationId: connector.organizationId.value,
      environment: connector.environment,
      connectorId: connector.id,
      signedGrant: signedGrant.toSnapshot()
    });

    expect(response.admission).toMatchObject({
      admitted: true,
      connectorId: connector.id,
      upstreamModelId: "gpt-oss-120b-instruct"
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "private_connector.runtime_admission.accepted"
      })
    );

    const invalidSignatureUseCase =
      new AdmitPrivateConnectorExecutionGrantUseCase(
        repository,
        signatureService,
        auditLog,
        () => new Date("2026-03-10T10:01:00.000Z")
      );
    const tamperedGrant = signedGrant.toSnapshot();
    tamperedGrant.signature =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    await expect(
      invalidSignatureUseCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        organizationId: connector.organizationId.value,
        environment: connector.environment,
        connectorId: connector.id,
        signedGrant: tamperedGrant
      })
    ).rejects.toBeInstanceOf(PrivateConnectorExecutionGrantRejectedError);

    const otherConnector = createConnector({
      id: "e5e34b83-f1f5-4bd3-a862-c225c9d4a173"
    });
    await expect(
      useCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        organizationId: connector.organizationId.value,
        environment: connector.environment,
        connectorId: otherConnector.id,
        signedGrant: signedGrant.toSnapshot()
      })
    ).rejects.toBeInstanceOf(PrivateConnectorNotFoundError);

    const expiredUseCase = new AdmitPrivateConnectorExecutionGrantUseCase(
      repository,
      signatureService,
      auditLog,
      () => new Date("2026-03-10T10:05:01.000Z")
    );

    await expect(
      expiredUseCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        organizationId: connector.organizationId.value,
        environment: connector.environment,
        connectorId: connector.id,
        signedGrant: signedGrant.toSnapshot()
      })
    ).rejects.toThrow("grant_expired");

    const aliasMismatchConnector = createConnector({
      aliases: [
        {
          requestModelAlias: "different-alias",
          upstreamModelId: "gpt-oss-120b-instruct"
        }
      ]
    });
    const aliasMismatchRepository = createRepository({
      connectors: [aliasMismatchConnector]
    });
    const aliasMismatchUseCase = new AdmitPrivateConnectorExecutionGrantUseCase(
      aliasMismatchRepository,
      signatureService,
      auditLog,
      () => new Date("2026-03-10T10:01:00.000Z")
    );

    await expect(
      aliasMismatchUseCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        organizationId: aliasMismatchConnector.organizationId.value,
        environment: aliasMismatchConnector.environment,
        connectorId: aliasMismatchConnector.id,
        signedGrant: signatureService
          .sign(
            PrivateConnectorExecutionGrant.issue({
              organizationId: aliasMismatchConnector.organizationId.value,
              connectorId: aliasMismatchConnector.id,
              environment: aliasMismatchConnector.environment,
              requestModelAlias: "openai/gpt-oss-120b-like",
              upstreamModelId: "gpt-oss-120b-instruct",
              maxTokens: 4096,
              issuedAt,
              expiresAt: new Date("2026-03-10T10:04:00.000Z")
            })
          )
          .toSnapshot()
      })
    ).rejects.toThrow("model_alias_unconfigured");

    const environmentMismatchUseCase =
      new AdmitPrivateConnectorExecutionGrantUseCase(
        repository,
        signatureService,
        auditLog,
        () => new Date("2026-03-10T10:01:00.000Z")
      );

    await expect(
      environmentMismatchUseCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        organizationId: connector.organizationId.value,
        environment: "production",
        connectorId: connector.id,
        signedGrant: signedGrant.toSnapshot()
      })
    ).rejects.toBeInstanceOf(PrivateConnectorEnvironmentMismatchError);

    const organizationMismatchUseCase =
      new AdmitPrivateConnectorExecutionGrantUseCase(
        createRepository({ connectors: [connector] }),
        signatureService,
        auditLog,
        () => new Date("2026-03-10T10:01:00.000Z")
      );

    await expect(
      organizationMismatchUseCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        organizationId: connector.organizationId.value,
        environment: connector.environment,
        connectorId: connector.id,
        signedGrant: signatureService
          .sign(
            PrivateConnectorExecutionGrant.issue({
              organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
              connectorId: connector.id,
              environment: connector.environment,
              requestModelAlias: "openai/gpt-oss-120b-like",
              upstreamModelId: "gpt-oss-120b-instruct",
              maxTokens: 4096,
              issuedAt,
              expiresAt: new Date("2026-03-10T10:04:00.000Z")
            })
          )
          .toSnapshot()
      })
    ).rejects.toThrow("organization_mismatch");
  });
});
