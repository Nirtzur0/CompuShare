import { DomainValidationError } from "../identity/DomainValidationError.js";
import {
  parseOrganizationApiKeyEnvironment,
  type OrganizationApiKeyEnvironment
} from "../identity/OrganizationApiKeyEnvironment.js";
import { OrganizationId } from "../identity/OrganizationId.js";

export interface GatewayUsageMeterEventSnapshot {
  workloadBundleId: string;
  occurredAt: string;
  customerOrganizationId: string;
  providerOrganizationId: string;
  providerNodeId: string;
  environment: OrganizationApiKeyEnvironment;
  approvedModelAlias: string;
  manifestId: string;
  decisionLogId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export class GatewayUsageMeterEvent {
  private constructor(
    public readonly workloadBundleId: string,
    public readonly occurredAt: Date,
    public readonly customerOrganizationId: OrganizationId,
    public readonly providerOrganizationId: OrganizationId,
    public readonly providerNodeId: string,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly approvedModelAlias: string,
    public readonly manifestId: string,
    public readonly decisionLogId: string,
    public readonly promptTokens: number,
    public readonly completionTokens: number,
    public readonly totalTokens: number,
    public readonly latencyMs: number
  ) {}

  public static record(
    input: GatewayUsageMeterEventSnapshot
  ): GatewayUsageMeterEvent {
    const approvedModelAlias = input.approvedModelAlias.trim();
    const manifestId = input.manifestId.trim();

    if (approvedModelAlias.length < 3 || approvedModelAlias.length > 120) {
      throw new DomainValidationError(
        "Approved model aliases must be between 3 and 120 characters."
      );
    }

    if (manifestId.length < 3 || manifestId.length > 120) {
      throw new DomainValidationError(
        "Manifest identifiers must be between 3 and 120 characters."
      );
    }

    if (
      !Number.isSafeInteger(input.promptTokens) ||
      !Number.isSafeInteger(input.completionTokens) ||
      !Number.isSafeInteger(input.totalTokens) ||
      input.promptTokens < 0 ||
      input.completionTokens < 0 ||
      input.totalTokens < 0
    ) {
      throw new DomainValidationError(
        "Gateway usage token counts must be non-negative safe integers."
      );
    }

    if (input.promptTokens + input.completionTokens !== input.totalTokens) {
      throw new DomainValidationError(
        "Gateway usage total tokens must equal prompt tokens plus completion tokens."
      );
    }

    if (!Number.isSafeInteger(input.latencyMs) || input.latencyMs < 0) {
      throw new DomainValidationError(
        "Gateway usage latency must be a non-negative safe integer in milliseconds."
      );
    }

    return new GatewayUsageMeterEvent(
      input.workloadBundleId,
      new Date(input.occurredAt),
      OrganizationId.create(input.customerOrganizationId),
      OrganizationId.create(input.providerOrganizationId),
      input.providerNodeId,
      parseOrganizationApiKeyEnvironment(input.environment),
      approvedModelAlias,
      manifestId,
      input.decisionLogId,
      input.promptTokens,
      input.completionTokens,
      input.totalTokens,
      input.latencyMs
    );
  }

  public toSnapshot(): GatewayUsageMeterEventSnapshot {
    return {
      workloadBundleId: this.workloadBundleId,
      occurredAt: this.occurredAt.toISOString(),
      customerOrganizationId: this.customerOrganizationId.value,
      providerOrganizationId: this.providerOrganizationId.value,
      providerNodeId: this.providerNodeId,
      environment: this.environment,
      approvedModelAlias: this.approvedModelAlias,
      manifestId: this.manifestId,
      decisionLogId: this.decisionLogId,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
      latencyMs: this.latencyMs
    };
  }
}
