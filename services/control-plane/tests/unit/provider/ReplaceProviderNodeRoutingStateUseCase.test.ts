import { describe, expect, it } from "vitest";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { PlacementScoringPolicy } from "../../../src/config/PlacementScoringPolicy.js";
import {
  ProviderRoutingStateApprovedModelAliasNotFoundError,
  ProviderRoutingStateCapabilityRequiredError,
  ProviderRoutingStateNodeNotFoundError,
  ProviderRoutingStateOrganizationNotFoundError,
  ReplaceProviderNodeRoutingStateUseCase
} from "../../../src/application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import type { ProviderRoutingStateRepository } from "../../../src/application/provider/ports/ProviderRoutingStateRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { ProviderWarmModelState } from "../../../src/domain/provider/ProviderWarmModelState.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";

class InMemoryProviderRoutingStateRepository implements ProviderRoutingStateRepository {
  public replacedWarmModelStates: readonly ProviderWarmModelState[] = [];

  public constructor(
    private readonly capabilities: readonly AccountCapability[] | null,
    private readonly nodeExists: boolean
  ) {}

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.capabilities);
  }

  public providerNodeExists(): Promise<boolean> {
    return Promise.resolve(this.nodeExists);
  }

  public replaceProviderNodeWarmModelStates(
    _providerNodeId: unknown,
    warmModelStates: readonly ProviderWarmModelState[]
  ): Promise<void> {
    this.replacedWarmModelStates = warmModelStates;
    return Promise.resolve();
  }
}

describe("ReplaceProviderNodeRoutingStateUseCase", () => {
  it("replaces validated warm aliases and records an audit event", async () => {
    const repository = new InMemoryProviderRoutingStateRepository(
      ["provider"],
      true
    );
    const auditEvents: string[] = [];
    const useCase = new ReplaceProviderNodeRoutingStateUseCase(
      repository,
      InMemoryApprovedChatModelCatalog.createDefault(),
      PlacementScoringPolicy.createDefault(),
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
      providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
      warmModelAliases: [
        {
          approvedModelAlias: "openai/gpt-oss-120b-like",
          expiresAt: "2026-03-10T10:10:00.000Z"
        }
      ]
    });

    expect(repository.replacedWarmModelStates).toHaveLength(1);
    expect(response.routingState.warmModelAliases).toEqual([
      {
        approvedModelAlias: "openai/gpt-oss-120b-like",
        declaredAt: "2026-03-10T10:00:00.000Z",
        expiresAt: "2026-03-10T10:10:00.000Z"
      }
    ]);
    expect(auditEvents).toEqual(["provider.node.routing_state.replaced"]);
  });

  it("rejects missing organizations", async () => {
    const useCase = new ReplaceProviderNodeRoutingStateUseCase(
      new InMemoryProviderRoutingStateRepository(null, true),
      InMemoryApprovedChatModelCatalog.createDefault(),
      PlacementScoringPolicy.createDefault(),
      { record: async () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
        providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
        warmModelAliases: []
      })
    ).rejects.toBeInstanceOf(ProviderRoutingStateOrganizationNotFoundError);
  });

  it("rejects organizations without provider capability", async () => {
    const useCase = new ReplaceProviderNodeRoutingStateUseCase(
      new InMemoryProviderRoutingStateRepository(["buyer"], true),
      InMemoryApprovedChatModelCatalog.createDefault(),
      PlacementScoringPolicy.createDefault(),
      { record: async () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
        providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
        warmModelAliases: []
      })
    ).rejects.toBeInstanceOf(ProviderRoutingStateCapabilityRequiredError);
  });

  it("rejects missing provider nodes", async () => {
    const useCase = new ReplaceProviderNodeRoutingStateUseCase(
      new InMemoryProviderRoutingStateRepository(["provider"], false),
      InMemoryApprovedChatModelCatalog.createDefault(),
      PlacementScoringPolicy.createDefault(),
      { record: async () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
        providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
        warmModelAliases: []
      })
    ).rejects.toBeInstanceOf(ProviderRoutingStateNodeNotFoundError);
  });

  it("rejects unknown approved aliases", async () => {
    const useCase = new ReplaceProviderNodeRoutingStateUseCase(
      new InMemoryProviderRoutingStateRepository(["provider"], true),
      InMemoryApprovedChatModelCatalog.createDefault(),
      PlacementScoringPolicy.createDefault(),
      { record: async () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
        providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
        warmModelAliases: [
          {
            approvedModelAlias: "openai/not-approved",
            expiresAt: "2026-03-10T10:10:00.000Z"
          }
        ]
      })
    ).rejects.toBeInstanceOf(
      ProviderRoutingStateApprovedModelAliasNotFoundError
    );
  });

  it("rejects warm aliases with invalid ttl", async () => {
    const useCase = new ReplaceProviderNodeRoutingStateUseCase(
      new InMemoryProviderRoutingStateRepository(["provider"], true),
      InMemoryApprovedChatModelCatalog.createDefault(),
      PlacementScoringPolicy.createDefault(),
      { record: async () => Promise.resolve() },
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    await expect(
      useCase.execute({
        organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
        providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            expiresAt: "2026-03-10T10:16:00.000Z"
          }
        ]
      })
    ).rejects.toBeInstanceOf(DomainValidationError);
  });
});
