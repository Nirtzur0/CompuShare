import type { AuditLog } from "../identity/ports/AuditLog.js";
import { ComplianceOverview } from "../../domain/compliance/ComplianceOverview.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import {
  canViewConsumerDashboard
} from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { SubprocessorRegistry } from "../../domain/compliance/SubprocessorRegistry.js";
import type { ComplianceDocumentSettings } from "../../domain/compliance/ComplianceDocumentSettings.js";
import type { PlatformSubprocessor } from "../../domain/compliance/PlatformSubprocessor.js";
import { parseOrganizationApiKeyEnvironment } from "../../domain/identity/OrganizationApiKeyEnvironment.js";
import type { ComplianceRepository } from "../compliance/ports/ComplianceRepository.js";

export interface GetComplianceOverviewRequest {
  organizationId: string;
  actorUserId: string;
  environment: "development" | "staging" | "production";
}

export interface GetComplianceOverviewResponse {
  overview: ReturnType<ComplianceOverview["toSnapshot"]>;
}

export class ComplianceOverviewOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ComplianceOverviewOrganizationNotFoundError";
  }
}

export class ComplianceOverviewCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before loading compliance overview data."
    );
    this.name = "ComplianceOverviewCapabilityRequiredError";
  }
}

export class ComplianceOverviewAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view compliance overview data."
    );
    this.name = "ComplianceOverviewAuthorizationError";
  }
}

export class GetComplianceOverviewUseCase {
  public constructor(
    private readonly repository: ComplianceRepository,
    private readonly auditLog: AuditLog,
    private readonly settings: ComplianceDocumentSettings,
    private readonly platformSubprocessors: readonly PlatformSubprocessor[],
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GetComplianceOverviewRequest
  ): Promise<GetComplianceOverviewResponse> {
    const viewedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const environment = parseOrganizationApiKeyEnvironment(request.environment);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ComplianceOverviewOrganizationNotFoundError(organizationId.value);
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new ComplianceOverviewCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canViewConsumerDashboard(actorMembership.role)
    ) {
      throw new ComplianceOverviewAuthorizationError();
    }

    const providerSubprocessors =
      await this.repository.listRoutableProviderSubprocessors({
        environment,
        now: viewedAt
      });
    const registry = SubprocessorRegistry.create({
      generatedAt: viewedAt,
      settings: this.settings.toSnapshot(),
      environment,
      platformSubprocessors: this.platformSubprocessors.map((entry) =>
        entry.toSnapshot()
      ),
      providerSubprocessors: providerSubprocessors.map((entry) =>
        entry.toSnapshot()
      )
    });
    const overview = ComplianceOverview.create({
      organizationId: organizationId.value,
      actorRole: actorMembership.role,
      registry: registry.toSnapshot()
    });
    const snapshot = overview.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.compliance_overview.viewed",
      occurredAt: viewedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        environment,
        platformSubprocessorCount: snapshot.registry.platformSubprocessors.length,
        providerSubprocessorCount: snapshot.registry.providerSubprocessors.length,
        providerAppendixStatus: snapshot.registry.providerAppendixStatus
      }
    });

    return {
      overview: snapshot
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }
}
