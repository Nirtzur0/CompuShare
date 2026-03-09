import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderMachineId } from "../../domain/provider/ProviderMachineId.js";
import { ProviderNode } from "../../domain/provider/ProviderNode.js";
import type { ProviderGpuInventorySnapshot } from "../../domain/provider/ProviderGpuInventory.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderNodeEnrollmentRepository } from "./ports/ProviderNodeEnrollmentRepository.js";

export interface EnrollProviderNodeRequest {
  organizationId: string;
  machineId: string;
  label: string;
  runtime: string;
  region: string;
  hostname: string;
  inventory: {
    driverVersion: string;
    gpus: readonly ProviderGpuInventorySnapshot[];
  };
}

export interface EnrollProviderNodeResponse {
  node: {
    id: string;
    organizationId: string;
    machineId: string;
    label: string;
    runtime: string;
    region: string;
    hostname: string;
    trustTier: string;
    healthState: string;
    inventory: {
      driverVersion: string;
      gpus: ProviderGpuInventorySnapshot[];
    };
    enrolledAt: string;
  };
}

export class ProviderOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderOrganizationNotFoundError";
  }
}

export class ProviderCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before enrolling provider nodes."
    );
    this.name = "ProviderCapabilityRequiredError";
  }
}

export class ProviderNodeMachineConflictError extends Error {
  public constructor(machineId: string) {
    super(
      `Provider node machine ID "${machineId}" is already enrolled for this organization.`
    );
    this.name = "ProviderNodeMachineConflictError";
  }
}

export class EnrollProviderNodeUseCase {
  public constructor(
    private readonly repository: ProviderNodeEnrollmentRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: EnrollProviderNodeRequest
  ): Promise<EnrollProviderNodeResponse> {
    const enrolledAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const machineId = ProviderMachineId.create(request.machineId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderOrganizationNotFoundError(organizationId.value);
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderCapabilityRequiredError();
    }

    if (
      await this.repository.providerNodeMachineIdExists(
        organizationId,
        machineId
      )
    ) {
      throw new ProviderNodeMachineConflictError(machineId.value);
    }

    const providerNode = ProviderNode.enroll({
      organizationId: organizationId.value,
      machineId: machineId.value,
      label: request.label,
      runtime: request.runtime,
      region: request.region,
      hostname: request.hostname,
      inventory: request.inventory,
      enrolledAt
    });

    await this.repository.createProviderNode(providerNode);
    await this.auditLog.record({
      eventName: "provider.node.enrolled",
      occurredAt: enrolledAt.toISOString(),
      actorUserId: organizationId.value,
      organizationId: organizationId.value,
      metadata: {
        providerNodeId: providerNode.id.value,
        machineId: providerNode.machineId.value,
        runtime: providerNode.runtime,
        region: providerNode.region.value,
        trustTier: providerNode.trustTier,
        healthState: providerNode.healthState
      }
    });

    return {
      node: providerNode.toSnapshot()
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
