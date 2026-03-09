import { describe, expect, it } from "vitest";
import {
  ProviderRoutingProfileCapabilityRequiredError,
  ProviderRoutingProfileNodeNotFoundError,
  ProviderRoutingProfileOrganizationNotFoundError,
  UpsertProviderNodeRoutingProfileUseCase
} from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { ProviderRoutingProfileRepository } from "../../../src/application/provider/ports/ProviderRoutingProfileRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import type { ProviderNodeRoutingProfile } from "../../../src/domain/provider/ProviderNodeRoutingProfile.js";
import type { ProviderNodeId } from "../../../src/domain/provider/ProviderNodeId.js";

class InMemoryProviderRoutingProfileRepository implements ProviderRoutingProfileRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "provider"
  ];
  public providerNodeExistsResult = true;
  public persistedProfile: ProviderNodeRoutingProfile | null = null;

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.accountCapabilities);
  }

  public providerNodeExists(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<boolean> {
    void organizationId;
    void providerNodeId;
    return Promise.resolve(this.providerNodeExistsResult);
  }

  public upsertProviderNodeRoutingProfile(
    routingProfile: ProviderNodeRoutingProfile
  ): Promise<void> {
    this.persistedProfile = routingProfile;
    return Promise.resolve();
  }
}

class InMemoryAuditLog implements AuditLog {
  public events: { eventName: string }[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push({ eventName: event.eventName });
    return Promise.resolve();
  }
}

describe("UpsertProviderNodeRoutingProfileUseCase", () => {
  it("persists provider node routing metadata", async () => {
    const repository = new InMemoryProviderRoutingProfileRepository();
    const auditLog = new InMemoryAuditLog();
    const useCase = new UpsertProviderNodeRoutingProfileUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-12T18:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      endpointUrl: "https://node-01.example.com/v1/chat/completions",
      priceFloorUsdPerHour: 5.25
    });

    expect(response.routingProfile).toMatchObject({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      endpointUrl: "https://node-01.example.com/v1/chat/completions",
      priceFloorUsdPerHour: 5.25
    });
    expect(repository.persistedProfile?.toSnapshot()).toMatchObject({
      endpointUrl: "https://node-01.example.com/v1/chat/completions"
    });
    expect(auditLog.events).toEqual([
      { eventName: "provider.node.routing_profile.upserted" }
    ]);
  });

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderRoutingProfileRepository();
    repository.accountCapabilities = null;
    const useCase = new UpsertProviderNodeRoutingProfileUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      })
    ).rejects.toBeInstanceOf(ProviderRoutingProfileOrganizationNotFoundError);
  });

  it("requires provider capability", async () => {
    const repository = new InMemoryProviderRoutingProfileRepository();
    repository.accountCapabilities = ["buyer"];
    const useCase = new UpsertProviderNodeRoutingProfileUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      })
    ).rejects.toBeInstanceOf(ProviderRoutingProfileCapabilityRequiredError);
  });

  it("rejects unknown provider nodes", async () => {
    const repository = new InMemoryProviderRoutingProfileRepository();
    repository.providerNodeExistsResult = false;
    const useCase = new UpsertProviderNodeRoutingProfileUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      })
    ).rejects.toBeInstanceOf(ProviderRoutingProfileNodeNotFoundError);
  });
});
