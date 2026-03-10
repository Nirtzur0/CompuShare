import { describe, expect, it, vi } from "vitest";
import {
  GetPrivateConnectorDashboardUseCase,
  PrivateConnectorDashboardAuthorizationError,
  PrivateConnectorDashboardCapabilityRequiredError,
  PrivateConnectorDashboardOrganizationNotFoundError
} from "../../../src/application/dashboard/GetPrivateConnectorDashboardUseCase.js";
import type { PrivateConnectorRepository } from "../../../src/application/privateConnector/ports/PrivateConnectorRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationRole } from "../../../src/domain/identity/OrganizationRole.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { PrivateConnector } from "../../../src/domain/privateConnector/PrivateConnector.js";

function createConnector(input?: {
  id?: string;
  lastCheckInAt?: Date | null;
  lastReadyAt?: Date | null;
}): PrivateConnector {
  return PrivateConnector.rehydrate({
    id: input?.id ?? "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
    organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
    environment: "development",
    label: "Primary connector",
    mode: "cluster",
    endpointUrl:
      "https://connector.internal/v1/private-connectors/chat/completions",
    modelMappings: [
      {
        requestModelAlias: "openai/gpt-oss-120b-like",
        upstreamModelId: "gpt-oss-120b-instruct"
      }
    ],
    runtimeVersion: "runtime-1",
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
    lastCheckInAt: input?.lastCheckInAt ?? null,
    lastReadyAt: input?.lastReadyAt ?? null,
    disabledAt: null
  });
}

function createRepository(input?: {
  capabilities?: readonly AccountCapability[] | null;
  role?: OrganizationRole;
  connectors?: readonly PrivateConnector[];
}): PrivateConnectorRepository {
  return {
    findOrganizationAccountCapabilities: () =>
      Promise.resolve(
        input?.capabilities === undefined
          ? (["buyer"] as const)
          : input.capabilities
      ),
    findOrganizationMember: () =>
      Promise.resolve(
        OrganizationMember.rehydrate({
          userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
          role: input?.role ?? "finance",
          joinedAt: new Date("2026-03-10T08:00:00.000Z")
        })
      ),
    listPrivateConnectors: () => Promise.resolve(input?.connectors ?? []),
    createPrivateConnector: () => Promise.resolve(undefined),
    findPrivateConnectorById: () => Promise.resolve(null),
    savePrivateConnector: () => Promise.resolve(undefined)
  };
}

describe("GetPrivateConnectorDashboardUseCase", () => {
  it("returns buyer connector dashboard snapshots and audits the view", async () => {
    const auditLog = { record: vi.fn(() => Promise.resolve(undefined)) };
    const useCase = new GetPrivateConnectorDashboardUseCase(
      createRepository({
        connectors: [
          createConnector({
            lastCheckInAt: new Date("2026-03-10T10:00:00.000Z"),
            lastReadyAt: new Date("2026-03-10T10:00:00.000Z")
          }),
          createConnector({
            id: "e5e34b83-f1f5-4bd3-a862-c225c9d4a173",
            lastCheckInAt: new Date("2026-03-10T09:55:00.000Z"),
            lastReadyAt: new Date("2026-03-10T09:55:00.000Z")
          })
        ]
      }),
      auditLog,
      () => new Date("2026-03-10T10:01:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.dashboard).toMatchObject({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      readyConnectorCount: 1,
      staleConnectorCount: 1
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "dashboard.private_connectors.viewed",
        metadata: {
          connectorCount: 2,
          readyConnectorCount: 1,
          staleConnectorCount: 1
        }
      })
    );
  });

  it("rejects missing organizations, missing buyer capability, and unauthorized roles", async () => {
    const auditLog = { record: vi.fn(() => Promise.resolve(undefined)) };

    await expect(
      new GetPrivateConnectorDashboardUseCase(
        createRepository({ capabilities: null }),
        auditLog
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(
      PrivateConnectorDashboardOrganizationNotFoundError
    );

    await expect(
      new GetPrivateConnectorDashboardUseCase(
        createRepository({ capabilities: ["provider"] }),
        auditLog
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorDashboardCapabilityRequiredError);

    await expect(
      new GetPrivateConnectorDashboardUseCase(
        createRepository({ role: "developer" }),
        auditLog
      ).execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toBeInstanceOf(PrivateConnectorDashboardAuthorizationError);
  });
});
