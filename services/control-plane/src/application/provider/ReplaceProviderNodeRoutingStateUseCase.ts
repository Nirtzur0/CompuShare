import type { ApprovedChatModelCatalog } from "../gateway/ports/ApprovedChatModelCatalog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import { ProviderWarmModelState } from "../../domain/provider/ProviderWarmModelState.js";
import { ProviderNodeRoutingState } from "../../domain/provider/ProviderNodeRoutingState.js";
import type { PlacementScoringPolicy } from "../../config/PlacementScoringPolicy.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderRoutingStateRepository } from "./ports/ProviderRoutingStateRepository.js";

export interface ReplaceProviderNodeRoutingStateRequest {
  organizationId: string;
  providerNodeId: string;
  warmModelAliases: readonly {
    approvedModelAlias: string;
    expiresAt: string;
  }[];
}

export interface ReplaceProviderNodeRoutingStateResponse {
  routingState: {
    warmModelAliases: readonly {
      approvedModelAlias: string;
      declaredAt: string;
      expiresAt: string;
    }[];
  };
}

export class ProviderRoutingStateOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderRoutingStateOrganizationNotFoundError";
  }
}

export class ProviderRoutingStateCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before configuring provider node routing state."
    );
    this.name = "ProviderRoutingStateCapabilityRequiredError";
  }
}

export class ProviderRoutingStateNodeNotFoundError extends Error {
  public constructor(providerNodeId: string) {
    super(
      `Provider node "${providerNodeId}" was not found for this organization.`
    );
    this.name = "ProviderRoutingStateNodeNotFoundError";
  }
}

export class ProviderRoutingStateApprovedModelAliasNotFoundError extends Error {
  public constructor(approvedModelAlias: string) {
    super(`Approved model alias "${approvedModelAlias}" was not found.`);
    this.name = "ProviderRoutingStateApprovedModelAliasNotFoundError";
  }
}

export class ReplaceProviderNodeRoutingStateUseCase {
  public constructor(
    private readonly repository: ProviderRoutingStateRepository,
    private readonly approvedChatModelCatalog: ApprovedChatModelCatalog,
    private readonly placementScoringPolicy: PlacementScoringPolicy,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: ReplaceProviderNodeRoutingStateRequest
  ): Promise<ReplaceProviderNodeRoutingStateResponse> {
    const declaredAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const providerNodeId = ProviderNodeId.create(request.providerNodeId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderRoutingStateOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderRoutingStateCapabilityRequiredError();
    }

    if (
      !(await this.repository.providerNodeExists(
        organizationId,
        providerNodeId
      ))
    ) {
      throw new ProviderRoutingStateNodeNotFoundError(providerNodeId.value);
    }

    const warmModelStates = request.warmModelAliases.map((warmModelAlias) => {
      if (
        this.approvedChatModelCatalog.findByAlias(
          warmModelAlias.approvedModelAlias
        ) === null
      ) {
        throw new ProviderRoutingStateApprovedModelAliasNotFoundError(
          warmModelAlias.approvedModelAlias
        );
      }

      const expiresAt = new Date(warmModelAlias.expiresAt);
      this.placementScoringPolicy.validateWarmModelExpiry(
        expiresAt,
        declaredAt
      );

      return ProviderWarmModelState.declare({
        approvedModelAlias: warmModelAlias.approvedModelAlias,
        declaredAt,
        expiresAt
      });
    });
    const routingState = ProviderNodeRoutingState.rehydrate({
      warmModelAliases: warmModelStates.map((warmModelState) => ({
        approvedModelAlias: warmModelState.approvedModelAlias,
        declaredAt: warmModelState.declaredAt,
        expiresAt: warmModelState.expiresAt
      }))
    });

    await this.repository.replaceProviderNodeWarmModelStates(
      providerNodeId,
      warmModelStates
    );
    await this.auditLog.record({
      eventName: "provider.node.routing_state.replaced",
      occurredAt: declaredAt.toISOString(),
      actorUserId: organizationId.value,
      organizationId: organizationId.value,
      metadata: {
        providerNodeId: providerNodeId.value,
        warmModelAliasCount: routingState.warmModelAliases.length,
        warmModelAliases: routingState.warmModelAliases.map(
          (warmModelAlias) => warmModelAlias.approvedModelAlias
        )
      }
    });

    return {
      routingState: routingState.toSnapshot()
    };
  }

  private hasProviderCapability(capabilities: readonly string[]): boolean {
    return capabilities.includes("provider");
  }
}
