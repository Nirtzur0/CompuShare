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
  executionTargetType?: "marketplace_provider" | "private_connector";
  providerOrganizationId: string | null;
  providerNodeId: string | null;
  privateConnectorId?: string | null;
  environment: OrganizationApiKeyEnvironment;
  requestKind: string;
  approvedModelAlias: string;
  manifestId: string | null;
  decisionLogId: string | null;
  batchId?: string | null;
  batchItemId?: string | null;
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
    public readonly executionTargetType:
      | "marketplace_provider"
      | "private_connector",
    public readonly providerOrganizationId: OrganizationId | null,
    public readonly providerNodeId: string | null,
    public readonly privateConnectorId: string | null,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly requestKind: "chat.completions" | "embeddings",
    public readonly approvedModelAlias: string,
    public readonly manifestId: string | null,
    public readonly decisionLogId: string | null,
    public readonly batchId: string | null,
    public readonly batchItemId: string | null,
    public readonly promptTokens: number,
    public readonly completionTokens: number,
    public readonly totalTokens: number,
    public readonly latencyMs: number
  ) {}

  public static record(
    input: GatewayUsageMeterEventSnapshot
  ): GatewayUsageMeterEvent {
    const executionTargetType: string =
      input.executionTargetType ?? "marketplace_provider";
    const privateConnectorId = input.privateConnectorId ?? null;
    const approvedModelAlias = input.approvedModelAlias.trim();
    const manifestId = input.manifestId?.trim() ?? null;
    const requestKind = input.requestKind;

    if (approvedModelAlias.length < 3 || approvedModelAlias.length > 120) {
      throw new DomainValidationError(
        "Approved model aliases must be between 3 and 120 characters."
      );
    }

    if (requestKind !== "chat.completions" && requestKind !== "embeddings") {
      throw new DomainValidationError(
        "Gateway usage request kind must be chat.completions or embeddings."
      );
    }

    if (executionTargetType === "marketplace_provider") {
      if (
        input.providerOrganizationId === null ||
        input.providerNodeId === null ||
        input.manifestId === null ||
        input.decisionLogId === null ||
        privateConnectorId !== null
      ) {
        throw new DomainValidationError(
          "Marketplace provider usage events require provider IDs, manifest ID, and decision log ID."
        );
      }
    }

    if (executionTargetType === "private_connector") {
      if (
        privateConnectorId === null ||
        input.providerOrganizationId !== null ||
        input.providerNodeId !== null
      ) {
        throw new DomainValidationError(
          "Private connector usage events require a private connector ID and no provider IDs."
        );
      }
    }

    if (
      executionTargetType !== "marketplace_provider" &&
      executionTargetType !== "private_connector"
    ) {
      throw new DomainValidationError(
        "Gateway usage execution target type must be marketplace_provider or private_connector."
      );
    }

    if (manifestId !== null && (manifestId.length < 3 || manifestId.length > 120)) {
      throw new DomainValidationError(
        "Manifest identifiers must be between 3 and 120 characters."
      );
    }

    if (
      input.decisionLogId !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.decisionLogId
      )
    ) {
      throw new DomainValidationError(
        "Decision log IDs must be valid UUIDs when provided."
      );
    }

    if (
      privateConnectorId !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        privateConnectorId
      )
    ) {
      throw new DomainValidationError(
        "Private connector IDs must be valid UUIDs when provided."
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
      executionTargetType,
      input.providerOrganizationId === null
        ? null
        : OrganizationId.create(input.providerOrganizationId),
      input.providerNodeId,
      privateConnectorId,
      parseOrganizationApiKeyEnvironment(input.environment),
      requestKind,
      approvedModelAlias,
      input.manifestId,
      input.decisionLogId,
      input.batchId ?? null,
      input.batchItemId ?? null,
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
      executionTargetType: this.executionTargetType,
      providerOrganizationId: this.providerOrganizationId?.value ?? null,
      providerNodeId: this.providerNodeId,
      privateConnectorId: this.privateConnectorId,
      environment: this.environment,
      requestKind: this.requestKind,
      approvedModelAlias: this.approvedModelAlias,
      manifestId: this.manifestId,
      decisionLogId: this.decisionLogId,
      batchId: this.batchId,
      batchItemId: this.batchItemId,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
      latencyMs: this.latencyMs
    };
  }
}
