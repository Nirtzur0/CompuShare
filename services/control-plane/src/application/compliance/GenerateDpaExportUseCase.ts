import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ComplianceRepository } from "./ports/ComplianceRepository.js";
import type { ComplianceDocumentSettings } from "../../domain/compliance/ComplianceDocumentSettings.js";
import type { PlatformSubprocessor } from "../../domain/compliance/PlatformSubprocessor.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import {
  canViewConsumerDashboard
} from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { parseOrganizationApiKeyEnvironment } from "../../domain/identity/OrganizationApiKeyEnvironment.js";
import type { ProviderSubprocessorSnapshot } from "../../domain/compliance/ProviderSubprocessor.js";

export interface ComplianceMarkdownTemplateSet {
  dpaBodyMarkdown: string;
  technicalOrganizationalMeasuresMarkdown: string;
}

export interface GenerateDpaExportRequest {
  organizationId: string;
  actorUserId: string;
  environment: "development" | "staging" | "production";
}

export interface GenerateDpaExportResponse {
  fileName: string;
  contentType: "text/markdown; charset=utf-8";
  markdown: string;
}

export class DpaExportOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "DpaExportOrganizationNotFoundError";
  }
}

export class DpaExportCapabilityRequiredError extends Error {
  public constructor() {
    super("Organization must have buyer capability before exporting a DPA.");
    this.name = "DpaExportCapabilityRequiredError";
  }
}

export class DpaExportAuthorizationError extends Error {
  public constructor() {
    super("Only owner, admin, or finance members may export the DPA pack.");
    this.name = "DpaExportAuthorizationError";
  }
}

export class GenerateDpaExportUseCase {
  public constructor(
    private readonly repository: ComplianceRepository,
    private readonly auditLog: AuditLog,
    private readonly settings: ComplianceDocumentSettings,
    private readonly platformSubprocessors: readonly PlatformSubprocessor[],
    private readonly templates: ComplianceMarkdownTemplateSet,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GenerateDpaExportRequest
  ): Promise<GenerateDpaExportResponse> {
    const generatedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const environment = parseOrganizationApiKeyEnvironment(request.environment);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new DpaExportOrganizationNotFoundError(organizationId.value);
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new DpaExportCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canViewConsumerDashboard(actorMembership.role)
    ) {
      throw new DpaExportAuthorizationError();
    }

    const providerSubprocessors =
      await this.repository.listRoutableProviderSubprocessors({
        environment,
        now: generatedAt
      });
    const markdown = this.renderMarkdown({
      organizationId: organizationId.value,
      environment,
      generatedAt,
      providerSubprocessors: providerSubprocessors.map((entry) =>
        entry.toSnapshot()
      )
    });

    await this.auditLog.record({
      eventName: "compliance.dpa_export.generated",
      occurredAt: generatedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        environment,
        providerSubprocessorCount: providerSubprocessors.length,
        markdownLength: markdown.length
      }
    });

    return {
      fileName: `compushare-dpa-${organizationId.value}-${environment}.md`,
      contentType: "text/markdown; charset=utf-8",
      markdown
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }

  private renderMarkdown(input: {
    organizationId: string;
    environment: "development" | "staging" | "production";
    generatedAt: Date;
    providerSubprocessors: readonly ProviderSubprocessorSnapshot[];
  }): string {
    const settings = this.settings.toSnapshot();
    const sections = [
      "# CompuShare Data Processing Addendum Export Pack",
      `- Legal entity: ${settings.legalEntityName}`,
      `- DPA version: ${settings.dpaVersion}`,
      `- Effective date: ${settings.dpaEffectiveDate}`,
      `- Buyer organization ID: ${input.organizationId}`,
      `- Selected environment: ${input.environment}`,
      `- Generated at: ${input.generatedAt.toISOString()}`,
      `- Privacy contact: ${settings.privacyEmail}`,
      `- Security contact: ${settings.securityEmail}`,
      "",
      "## Canonical DPA Body",
      this.templates.dpaBodyMarkdown.trim(),
      "",
      "## Technical and Organizational Measures",
      this.templates.technicalOrganizationalMeasuresMarkdown.trim(),
      "",
      "## Appendix A — Platform Subprocessors",
      this.renderPlatformAppendix(),
      "",
      `## Appendix B — Routable Provider Subprocessors (${input.environment})`,
      this.renderProviderAppendix(input.providerSubprocessors)
    ];

    return `${sections.join("\n").trim()}\n`;
  }

  private renderPlatformAppendix(): string {
    const lines = [
      "| Vendor | Status | Purpose | Data categories | Regions | Transfer mechanism | Activation condition | Last reviewed |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |"
    ];

    for (const entry of this.platformSubprocessors) {
      const snapshot = entry.toSnapshot();
      lines.push(
        `| ${snapshot.vendorName} | ${snapshot.status} | ${snapshot.purpose} | ${snapshot.dataCategories.join(", ")} | ${snapshot.regions.join(", ")} | ${snapshot.transferMechanism} | ${snapshot.activationCondition ?? "Always"} | ${snapshot.lastReviewedAt} |`
      );
    }

    return lines.join("\n");
  }

  private renderProviderAppendix(
    providerSubprocessors: readonly ProviderSubprocessorSnapshot[]
  ): string {
    if (providerSubprocessors.length === 0) {
      return "No provider organizations are currently routable in the selected environment. The provider subprocessor appendix is therefore empty for this export.";
    }

    const lines = [
      "| Provider organization | Slug | Environment | Routable nodes | Regions | Trust ceiling | Active attestation | Routing available |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |"
    ];

    for (const entry of providerSubprocessors) {
      lines.push(
        `| ${entry.organizationName} (${entry.organizationId}) | ${entry.organizationSlug} | ${entry.environment} | ${String(entry.routableNodeCount)} | ${entry.regions.join(", ")} | ${entry.trustTierCeiling ?? "unknown"} | ${entry.hasActiveAttestation ? "yes" : "no"} | ${entry.routingAvailable ? "yes" : "no"} |`
      );
    }

    return lines.join("\n");
  }
}
