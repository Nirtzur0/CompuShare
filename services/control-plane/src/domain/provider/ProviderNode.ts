import { OrganizationId } from "../identity/OrganizationId.js";
import {
  ProviderGpuInventory,
  type ProviderGpuInventorySnapshot
} from "./ProviderGpuInventory.js";
import {
  type ProviderHealthState,
  parseProviderHealthState
} from "./ProviderHealthState.js";
import { ProviderHostname } from "./ProviderHostname.js";
import {
  ProviderNodeAttestation,
  type ProviderNodeAttestationSnapshot
} from "./ProviderNodeAttestation.js";
import { ProviderMachineId } from "./ProviderMachineId.js";
import { ProviderNodeId } from "./ProviderNodeId.js";
import { ProviderNodeLabel } from "./ProviderNodeLabel.js";
import {
  ProviderNodeRoutingProfile,
  type ProviderNodeRoutingProfileSnapshot
} from "./ProviderNodeRoutingProfile.js";
import {
  ProviderNodeRoutingState,
  type ProviderNodeRoutingStateSnapshot
} from "./ProviderNodeRoutingState.js";
import { ProviderRegion } from "./ProviderRegion.js";
import {
  type ProviderRuntime,
  parseProviderRuntime
} from "./ProviderRuntime.js";
import {
  type ProviderTrustTier,
  parseProviderTrustTier
} from "./ProviderTrustTier.js";

export interface ProviderNodeSnapshot {
  id: string;
  organizationId: string;
  machineId: string;
  label: string;
  runtime: ProviderRuntime;
  region: string;
  hostname: string;
  trustTier: ProviderTrustTier;
  healthState: ProviderHealthState;
  inventory: {
    driverVersion: string;
    gpus: ProviderGpuInventorySnapshot[];
  };
  attestation?: ProviderNodeAttestationSnapshot;
  routingProfile: ProviderNodeRoutingProfileSnapshot | null;
  routingState?: ProviderNodeRoutingStateSnapshot;
  enrolledAt: string;
}

export class ProviderNode {
  private constructor(
    public readonly id: ProviderNodeId,
    public readonly organizationId: OrganizationId,
    public readonly machineId: ProviderMachineId,
    public readonly label: ProviderNodeLabel,
    public readonly runtime: ProviderRuntime,
    public readonly region: ProviderRegion,
    public readonly hostname: ProviderHostname,
    public readonly trustTier: ProviderTrustTier,
    public readonly healthState: ProviderHealthState,
    public readonly inventory: ProviderGpuInventory,
    public readonly attestation: ProviderNodeAttestation,
    public readonly routingProfile: ProviderNodeRoutingProfile | null,
    public readonly routingState: ProviderNodeRoutingState,
    public readonly enrolledAt: Date
  ) {}

  public static enroll(input: {
    organizationId: string;
    machineId: string;
    label: string;
    runtime: string;
    region: string;
    hostname: string;
    trustTier?: ProviderTrustTier;
    healthState?: ProviderHealthState;
    inventory: {
      driverVersion: string;
      gpus: readonly ProviderGpuInventorySnapshot[];
    };
    attestation?: ProviderNodeAttestationSnapshot | null;
    routingProfile?: ProviderNodeRoutingProfileSnapshot | null;
    routingState?: ProviderNodeRoutingStateSnapshot | null;
    enrolledAt: Date;
  }): ProviderNode {
    return new ProviderNode(
      ProviderNodeId.create(),
      OrganizationId.create(input.organizationId),
      ProviderMachineId.create(input.machineId),
      ProviderNodeLabel.create(input.label),
      parseProviderRuntime(input.runtime),
      ProviderRegion.create(input.region),
      ProviderHostname.create(input.hostname),
      input.trustTier ?? "t1_vetted",
      input.healthState ?? "healthy",
      ProviderGpuInventory.create({
        driverVersion: input.inventory.driverVersion,
        items: input.inventory.gpus
      }),
      input.attestation === undefined || input.attestation === null
        ? ProviderNodeAttestation.none(input.trustTier ?? "t1_vetted")
        : ProviderNodeAttestation.rehydrate({
            status: input.attestation.status,
            lastAttestedAt:
              input.attestation.lastAttestedAt === null
                ? null
                : new Date(input.attestation.lastAttestedAt),
            attestationExpiresAt:
              input.attestation.attestationExpiresAt === null
                ? null
                : new Date(input.attestation.attestationExpiresAt),
            attestationType: input.attestation.attestationType,
            effectiveTrustTier: input.attestation.effectiveTrustTier
          }),
      input.routingProfile === undefined || input.routingProfile === null
        ? null
        : ProviderNodeRoutingProfile.rehydrate({
            providerNodeId: input.routingProfile.providerNodeId,
            endpointUrl: input.routingProfile.endpointUrl,
            priceFloorUsdPerHour: input.routingProfile.priceFloorUsdPerHour,
            updatedAt: new Date(input.routingProfile.updatedAt)
          }),
      input.routingState === undefined || input.routingState === null
        ? ProviderNodeRoutingState.empty()
        : ProviderNodeRoutingState.rehydrate({
            warmModelAliases: input.routingState.warmModelAliases.map(
              (warmModelAlias) => ({
                approvedModelAlias: warmModelAlias.approvedModelAlias,
                declaredAt: new Date(warmModelAlias.declaredAt),
                expiresAt: new Date(warmModelAlias.expiresAt)
              })
            )
          }),
      input.enrolledAt
    );
  }

  public static rehydrate(input: {
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
      gpus: readonly ProviderGpuInventorySnapshot[];
    };
    attestation?: ProviderNodeAttestationSnapshot;
    routingProfile?: ProviderNodeRoutingProfileSnapshot | null;
    routingState?: ProviderNodeRoutingStateSnapshot | null;
    enrolledAt: Date;
  }): ProviderNode {
    return new ProviderNode(
      ProviderNodeId.create(input.id),
      OrganizationId.create(input.organizationId),
      ProviderMachineId.create(input.machineId),
      ProviderNodeLabel.create(input.label),
      parseProviderRuntime(input.runtime),
      ProviderRegion.create(input.region),
      ProviderHostname.create(input.hostname),
      parseProviderTrustTier(input.trustTier),
      parseProviderHealthState(input.healthState),
      ProviderGpuInventory.create({
        driverVersion: input.inventory.driverVersion,
        items: input.inventory.gpus
      }),
      input.attestation === undefined
        ? ProviderNodeAttestation.none(parseProviderTrustTier(input.trustTier))
        : ProviderNodeAttestation.rehydrate({
            status: input.attestation.status,
            lastAttestedAt:
              input.attestation.lastAttestedAt === null
                ? null
                : new Date(input.attestation.lastAttestedAt),
            attestationExpiresAt:
              input.attestation.attestationExpiresAt === null
                ? null
                : new Date(input.attestation.attestationExpiresAt),
            attestationType: input.attestation.attestationType,
            effectiveTrustTier: input.attestation.effectiveTrustTier
          }),
      input.routingProfile === undefined || input.routingProfile === null
        ? null
        : ProviderNodeRoutingProfile.rehydrate({
            providerNodeId: input.routingProfile.providerNodeId,
            endpointUrl: input.routingProfile.endpointUrl,
            priceFloorUsdPerHour: input.routingProfile.priceFloorUsdPerHour,
            updatedAt: new Date(input.routingProfile.updatedAt)
          }),
      input.routingState === undefined || input.routingState === null
        ? ProviderNodeRoutingState.empty()
        : ProviderNodeRoutingState.rehydrate({
            warmModelAliases: input.routingState.warmModelAliases.map(
              (warmModelAlias) => ({
                approvedModelAlias: warmModelAlias.approvedModelAlias,
                declaredAt: new Date(warmModelAlias.declaredAt),
                expiresAt: new Date(warmModelAlias.expiresAt)
              })
            )
          }),
      input.enrolledAt
    );
  }

  public toSnapshot(): ProviderNodeSnapshot {
    return {
      id: this.id.value,
      organizationId: this.organizationId.value,
      machineId: this.machineId.value,
      label: this.label.value,
      runtime: this.runtime,
      region: this.region.value,
      hostname: this.hostname.value,
      trustTier: this.trustTier,
      healthState: this.healthState,
      inventory: {
        driverVersion: this.inventory.driverVersion,
        gpus: this.inventory.items.map((item) => item.toSnapshot())
      },
      attestation: this.attestation.toSnapshot(),
      routingProfile: this.routingProfile?.toSnapshot() ?? null,
      routingState: this.routingState.toSnapshot(),
      enrolledAt: this.enrolledAt.toISOString()
    };
  }
}
