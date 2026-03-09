import { describe, expect, it } from "vitest";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import {
  EnrollProviderNodeUseCase,
  ProviderCapabilityRequiredError,
  ProviderNodeMachineConflictError,
  ProviderOrganizationNotFoundError,
  type EnrollProviderNodeRequest
} from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { ProviderNodeEnrollmentRepository } from "../../../src/application/provider/ports/ProviderNodeEnrollmentRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import type { ProviderMachineId } from "../../../src/domain/provider/ProviderMachineId.js";
import type { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryProviderNodeEnrollmentRepository implements ProviderNodeEnrollmentRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "provider"
  ];
  public machineConflict = false;
  public providerNode: ProviderNode | null = null;

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.accountCapabilities);
  }

  public providerNodeMachineIdExists(
    organizationId: OrganizationId,
    machineId: ProviderMachineId
  ): Promise<boolean> {
    void organizationId;
    void machineId;
    return Promise.resolve(this.machineConflict);
  }

  public createProviderNode(providerNode: ProviderNode): Promise<void> {
    this.providerNode = providerNode;
    return Promise.resolve();
  }
}

describe("EnrollProviderNodeUseCase", () => {
  const request: EnrollProviderNodeRequest = {
    organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
    machineId: "node-machine-0001",
    label: "Primary Vetted Node",
    runtime: "linux",
    region: "eu-central-1",
    hostname: "node-01.internal",
    inventory: {
      driverVersion: "550.54.14",
      gpus: [
        {
          model: "NVIDIA A100",
          vramGb: 80,
          count: 4,
          interconnect: "nvlink"
        }
      ]
    }
  };

  it("enrolls a provider node and initializes trust and health", async () => {
    const repository = new InMemoryProviderNodeEnrollmentRepository();
    const auditLog = new RecordingAuditLog();
    const useCase = new EnrollProviderNodeUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T17:00:00.000Z")
    );

    const response = await useCase.execute(request);

    expect(response.node).toMatchObject({
      organizationId: request.organizationId,
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: "node-01.internal",
      trustTier: "t1_vetted",
      healthState: "healthy",
      inventory: {
        driverVersion: "550.54.14",
        gpus: [
          {
            model: "NVIDIA A100",
            vramGb: 80,
            count: 4,
            interconnect: "nvlink"
          }
        ]
      },
      enrolledAt: "2026-03-09T17:00:00.000Z"
    });
    expect(repository.providerNode).not.toBeNull();
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]).toMatchObject({
      eventName: "provider.node.enrolled",
      organizationId: request.organizationId,
      metadata: {
        machineId: "node-machine-0001",
        runtime: "linux",
        region: "eu-central-1",
        trustTier: "t1_vetted",
        healthState: "healthy"
      }
    });
  });

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderNodeEnrollmentRepository();
    repository.accountCapabilities = null;
    const useCase = new EnrollProviderNodeUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      ProviderOrganizationNotFoundError
    );
  });

  it("requires provider capability", async () => {
    const repository = new InMemoryProviderNodeEnrollmentRepository();
    repository.accountCapabilities = ["buyer"];
    const useCase = new EnrollProviderNodeUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      ProviderCapabilityRequiredError
    );
  });

  it("rejects duplicate machine IDs per organization", async () => {
    const repository = new InMemoryProviderNodeEnrollmentRepository();
    repository.machineConflict = true;
    const useCase = new EnrollProviderNodeUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      ProviderNodeMachineConflictError
    );
  });
});
