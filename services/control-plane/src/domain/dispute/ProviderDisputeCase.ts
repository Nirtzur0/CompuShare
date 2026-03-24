import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import { UserId } from "../identity/UserId.js";
import { UsdAmount } from "../ledger/UsdAmount.js";

export type ProviderDisputeType = "settlement" | "chargeback";
export type ProviderDisputeSource = "manual" | "stripe_webhook";
export type ProviderDisputeStatus =
  | "open"
  | "under_review"
  | "won"
  | "lost"
  | "recovered"
  | "canceled";

export interface ProviderDisputeEvidenceEntrySnapshot {
  label: string;
  value: string;
}

export interface ProviderDisputeAllocationSnapshot {
  providerOrganizationId: string;
  amountUsd: string;
}

export interface ProviderDisputeCaseSnapshot {
  id: string;
  buyerOrganizationId: string;
  createdByUserId: string | null;
  disputeType: ProviderDisputeType;
  source: ProviderDisputeSource;
  status: ProviderDisputeStatus;
  paymentReference: string | null;
  jobReference: string | null;
  disputedAmountUsd: string;
  reasonCode: string;
  summary: string;
  stripeDisputeId: string | null;
  stripeChargeId: string | null;
  stripeReason: string | null;
  stripeStatus: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  evidenceEntries: ProviderDisputeEvidenceEntrySnapshot[];
  allocations: ProviderDisputeAllocationSnapshot[];
}

export class ProviderDisputeEvidenceEntry {
  private constructor(
    public readonly label: string,
    public readonly value: string
  ) {}

  public static create(
    input: ProviderDisputeEvidenceEntrySnapshot
  ): ProviderDisputeEvidenceEntry {
    const label = input.label.trim();
    const value = input.value.trim();

    if (label.length < 2 || label.length > 80) {
      throw new DomainValidationError(
        "Provider dispute evidence labels must be between 2 and 80 characters."
      );
    }

    if (value.length < 1 || value.length > 500) {
      throw new DomainValidationError(
        "Provider dispute evidence values must be between 1 and 500 characters."
      );
    }

    return new ProviderDisputeEvidenceEntry(label, value);
  }

  public toSnapshot(): ProviderDisputeEvidenceEntrySnapshot {
    return {
      label: this.label,
      value: this.value
    };
  }
}

export class ProviderDisputeAllocation {
  private constructor(
    public readonly providerOrganizationId: OrganizationId,
    public readonly amount: UsdAmount
  ) {}

  public static create(
    input: ProviderDisputeAllocationSnapshot
  ): ProviderDisputeAllocation {
    return new ProviderDisputeAllocation(
      OrganizationId.create(input.providerOrganizationId),
      UsdAmount.parse(input.amountUsd)
    );
  }

  public toSnapshot(): ProviderDisputeAllocationSnapshot {
    return {
      providerOrganizationId: this.providerOrganizationId.value,
      amountUsd: this.amount.toUsdString()
    };
  }
}

export class ProviderDisputeCase {
  private constructor(
    public readonly id: string,
    public readonly buyerOrganizationId: OrganizationId,
    public readonly createdByUserId: UserId | null,
    public readonly disputeType: ProviderDisputeType,
    public readonly source: ProviderDisputeSource,
    public readonly status: ProviderDisputeStatus,
    public readonly paymentReference: string | null,
    public readonly jobReference: string | null,
    public readonly disputedAmount: UsdAmount,
    public readonly reasonCode: string,
    public readonly summary: string,
    public readonly stripeDisputeId: string | null,
    public readonly stripeChargeId: string | null,
    public readonly stripeReason: string | null,
    public readonly stripeStatus: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly resolvedAt: Date | null,
    public readonly evidenceEntries: readonly ProviderDisputeEvidenceEntry[],
    public readonly allocations: readonly ProviderDisputeAllocation[]
  ) {}

  public static createSettlement(input: {
    buyerOrganizationId: string;
    createdByUserId: string;
    providerOrganizationId: string;
    jobReference: string;
    disputedAmountUsd: string;
    reasonCode: string;
    summary: string;
    evidenceEntries: readonly ProviderDisputeEvidenceEntrySnapshot[];
    createdAt: Date;
  }): ProviderDisputeCase {
    const disputedAmount = UsdAmount.parse(input.disputedAmountUsd);
    const evidenceEntries = this.parseEvidenceEntries(input.evidenceEntries);

    if (evidenceEntries.length === 0) {
      throw new DomainValidationError(
        "Settlement disputes require at least one evidence entry."
      );
    }

    return new ProviderDisputeCase(
      randomUUID(),
      OrganizationId.create(input.buyerOrganizationId),
      UserId.create(input.createdByUserId),
      "settlement",
      "manual",
      "open",
      null,
      this.parseReference(input.jobReference, "Job references"),
      disputedAmount,
      this.parseReasonCode(input.reasonCode),
      this.parseSummary(input.summary),
      null,
      null,
      null,
      null,
      input.createdAt,
      input.createdAt,
      null,
      evidenceEntries,
      [
        ProviderDisputeAllocation.create({
          providerOrganizationId: input.providerOrganizationId,
          amountUsd: disputedAmount.toUsdString()
        })
      ]
    );
  }

  public static createChargeback(input: {
    buyerOrganizationId: string;
    createdByUserId: string | null;
    paymentReference: string;
    disputedAmountUsd: string;
    reasonCode: string;
    summary: string;
    source: ProviderDisputeSource;
    evidenceEntries: readonly ProviderDisputeEvidenceEntrySnapshot[];
    createdAt: Date;
    stripeDisputeId?: string | null;
    stripeChargeId?: string | null;
    stripeReason?: string | null;
    stripeStatus?: string | null;
  }): ProviderDisputeCase {
    const evidenceEntries =
      input.source === "manual"
        ? this.parseEvidenceEntries(input.evidenceEntries)
        : this.parseOptionalEvidenceEntries(input.evidenceEntries);

    if (input.source === "manual" && evidenceEntries.length === 0) {
      throw new DomainValidationError(
        "Manual chargeback disputes require at least one evidence entry."
      );
    }

    return new ProviderDisputeCase(
      randomUUID(),
      OrganizationId.create(input.buyerOrganizationId),
      input.createdByUserId === null ? null : UserId.create(input.createdByUserId),
      "chargeback",
      input.source,
      "open",
      this.parseReference(input.paymentReference, "Payment references"),
      null,
      UsdAmount.parse(input.disputedAmountUsd),
      this.parseReasonCode(input.reasonCode),
      this.parseSummary(input.summary),
      this.parseOptionalExternalId(input.stripeDisputeId),
      this.parseOptionalExternalId(input.stripeChargeId),
      this.parseOptionalExternalId(input.stripeReason),
      this.parseOptionalExternalId(input.stripeStatus),
      input.createdAt,
      input.createdAt,
      null,
      evidenceEntries,
      []
    );
  }

  public static rehydrate(input: {
    id: string;
    buyerOrganizationId: string;
    createdByUserId: string | null;
    disputeType: string;
    source: string;
    status: string;
    paymentReference: string | null;
    jobReference: string | null;
    disputedAmountUsd: string;
    reasonCode: string;
    summary: string;
    stripeDisputeId: string | null;
    stripeChargeId: string | null;
    stripeReason: string | null;
    stripeStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    evidenceEntries: readonly ProviderDisputeEvidenceEntrySnapshot[];
    allocations: readonly ProviderDisputeAllocationSnapshot[];
  }): ProviderDisputeCase {
    return new ProviderDisputeCase(
      this.parseId(input.id),
      OrganizationId.create(input.buyerOrganizationId),
      input.createdByUserId === null ? null : UserId.create(input.createdByUserId),
      this.parseDisputeType(input.disputeType),
      this.parseSource(input.source),
      this.parseStatus(input.status),
      input.paymentReference === null
        ? null
        : this.parseReference(input.paymentReference, "Payment references"),
      input.jobReference === null
        ? null
        : this.parseReference(input.jobReference, "Job references"),
      UsdAmount.parse(input.disputedAmountUsd),
      this.parseReasonCode(input.reasonCode),
      this.parseSummary(input.summary),
      this.parseOptionalExternalId(input.stripeDisputeId),
      this.parseOptionalExternalId(input.stripeChargeId),
      this.parseOptionalExternalId(input.stripeReason),
      this.parseOptionalExternalId(input.stripeStatus),
      input.createdAt,
      input.updatedAt,
      input.resolvedAt,
      this.parseOptionalEvidenceEntries(input.evidenceEntries),
      this.parseAllocations(input.allocations)
    ).validateInvariants();
  }

  public replaceAllocations(input: {
    allocations: readonly ProviderDisputeAllocationSnapshot[];
    updatedAt: Date;
  }): ProviderDisputeCase {
    if (this.disputeType !== "chargeback") {
      throw new DomainValidationError(
        "Only chargeback disputes may be allocated after creation."
      );
    }

    return new ProviderDisputeCase(
      this.id,
      this.buyerOrganizationId,
      this.createdByUserId,
      this.disputeType,
      this.source,
      this.status,
      this.paymentReference,
      this.jobReference,
      this.disputedAmount,
      this.reasonCode,
      this.summary,
      this.stripeDisputeId,
      this.stripeChargeId,
      this.stripeReason,
      this.stripeStatus,
      this.createdAt,
      input.updatedAt,
      this.resolvedAt,
      this.evidenceEntries,
      ProviderDisputeCase.parseAllocations(input.allocations)
    ).validateInvariants();
  }

  public transitionStatus(input: {
    nextStatus: ProviderDisputeStatus;
    occurredAt: Date;
  }): ProviderDisputeCase {
    ProviderDisputeCase.assertValidTransition(this.status, input.nextStatus);

    return new ProviderDisputeCase(
      this.id,
      this.buyerOrganizationId,
      this.createdByUserId,
      this.disputeType,
      this.source,
      input.nextStatus,
      this.paymentReference,
      this.jobReference,
      this.disputedAmount,
      this.reasonCode,
      this.summary,
      this.stripeDisputeId,
      this.stripeChargeId,
      this.stripeReason,
      this.stripeStatus,
      this.createdAt,
      input.occurredAt,
      ProviderDisputeCase.isResolvedStatus(input.nextStatus)
        ? input.occurredAt
        : this.resolvedAt,
      this.evidenceEntries,
      this.allocations
    );
  }

  public syncStripeChargeback(input: {
    disputedAmountUsd: string;
    reasonCode: string;
    summary: string;
    stripeDisputeId: string;
    stripeChargeId: string;
    stripeReason: string;
    stripeStatus: string;
    nextStatus: ProviderDisputeStatus;
    occurredAt: Date;
  }): ProviderDisputeCase {
    const currentStatus =
      this.status === input.nextStatus
        ? this.status
        : ProviderDisputeCase.coerceStripeStatus(input.nextStatus);

    return new ProviderDisputeCase(
      this.id,
      this.buyerOrganizationId,
      this.createdByUserId,
      "chargeback",
      this.source === "manual" ? "manual" : "stripe_webhook",
      currentStatus,
      this.paymentReference,
      null,
      UsdAmount.parse(input.disputedAmountUsd),
      ProviderDisputeCase.parseReasonCode(input.reasonCode),
      ProviderDisputeCase.parseSummary(input.summary),
      ProviderDisputeCase.parseOptionalExternalId(input.stripeDisputeId),
      ProviderDisputeCase.parseOptionalExternalId(input.stripeChargeId),
      ProviderDisputeCase.parseOptionalExternalId(input.stripeReason),
      ProviderDisputeCase.parseOptionalExternalId(input.stripeStatus),
      this.createdAt,
      input.occurredAt,
      ProviderDisputeCase.isResolvedStatus(currentStatus)
        ? input.occurredAt
        : this.resolvedAt,
      this.evidenceEntries,
      this.allocations
    ).validateInvariants();
  }

  public activeAllocatedAmountForProvider(providerOrganizationId: string): UsdAmount {
    if (!this.isActiveForExposure()) {
      return UsdAmount.zero();
    }

    return this.allocations
      .filter(
        (allocation) =>
          allocation.providerOrganizationId.value === providerOrganizationId
      )
      .reduce(
        (total, allocation) => total.add(allocation.amount),
        UsdAmount.zero()
      );
  }

  public get activeAllocatedAmount(): UsdAmount {
    if (!this.isActiveForExposure()) {
      return UsdAmount.zero();
    }

    return this.allocations.reduce(
      (total, allocation) => total.add(allocation.amount),
      UsdAmount.zero()
    );
  }

  public hasAllocations(): boolean {
    return this.allocations.length > 0;
  }

  public isActiveForExposure(): boolean {
    return (
      this.status === "open" ||
      this.status === "under_review" ||
      this.status === "lost"
    );
  }

  public toSnapshot(): ProviderDisputeCaseSnapshot {
    return {
      id: this.id,
      buyerOrganizationId: this.buyerOrganizationId.value,
      createdByUserId: this.createdByUserId?.value ?? null,
      disputeType: this.disputeType,
      source: this.source,
      status: this.status,
      paymentReference: this.paymentReference,
      jobReference: this.jobReference,
      disputedAmountUsd: this.disputedAmount.toUsdString(),
      reasonCode: this.reasonCode,
      summary: this.summary,
      stripeDisputeId: this.stripeDisputeId,
      stripeChargeId: this.stripeChargeId,
      stripeReason: this.stripeReason,
      stripeStatus: this.stripeStatus,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      resolvedAt: this.resolvedAt?.toISOString() ?? null,
      evidenceEntries: this.evidenceEntries.map((entry) => entry.toSnapshot()),
      allocations: this.allocations.map((allocation) => allocation.toSnapshot())
    };
  }

  private validateInvariants(): this {
    if (this.disputeType === "settlement") {
      if (this.jobReference === null) {
        throw new DomainValidationError(
          "Settlement disputes must include a job reference."
        );
      }

      if (this.paymentReference !== null) {
        throw new DomainValidationError(
          "Settlement disputes cannot include a payment reference."
        );
      }

      if (this.allocations.length !== 1) {
        throw new DomainValidationError(
          "Settlement disputes must have exactly one provider allocation."
        );
      }
    }

    if (this.disputeType === "chargeback" && this.paymentReference === null) {
      throw new DomainValidationError(
        "Chargeback disputes must include a payment reference."
      );
    }

    const totalAllocated = this.allocations.reduce(
      (total, allocation) => total.add(allocation.amount),
      UsdAmount.zero()
    );

    if (totalAllocated.cents > this.disputedAmount.cents) {
      throw new DomainValidationError(
        "Provider dispute allocations cannot exceed the disputed amount."
      );
    }

    return this;
  }

  private static parseAllocations(
    allocations: readonly ProviderDisputeAllocationSnapshot[]
  ): readonly ProviderDisputeAllocation[] {
    const parsed = allocations.map((allocation) =>
      ProviderDisputeAllocation.create(allocation)
    );
    const seen = new Set<string>();

    for (const allocation of parsed) {
      if (seen.has(allocation.providerOrganizationId.value)) {
        throw new DomainValidationError(
          "Provider dispute allocations may include each provider only once."
        );
      }

      seen.add(allocation.providerOrganizationId.value);
    }

    return parsed;
  }

  private static parseEvidenceEntries(
    entries: readonly ProviderDisputeEvidenceEntrySnapshot[]
  ): readonly ProviderDisputeEvidenceEntry[] {
    const parsed = this.parseOptionalEvidenceEntries(entries);

    if (parsed.length === 0) {
      throw new DomainValidationError(
        "Provider disputes require at least one evidence entry."
      );
    }

    return parsed;
  }

  private static parseOptionalEvidenceEntries(
    entries: readonly ProviderDisputeEvidenceEntrySnapshot[]
  ): readonly ProviderDisputeEvidenceEntry[] {
    return entries.map((entry) => ProviderDisputeEvidenceEntry.create(entry));
  }

  private static parseReasonCode(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new DomainValidationError(
        "Provider dispute reason codes must be between 2 and 80 characters."
      );
    }

    return trimmed;
  }

  private static parseSummary(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new DomainValidationError(
        "Provider dispute summaries must be between 5 and 500 characters."
      );
    }

    return trimmed;
  }

  private static parseReference(rawValue: string, label: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        `${label} must be between 3 and 120 characters.`
      );
    }

    return trimmed;
  }

  private static parseOptionalExternalId(rawValue?: string | null): string | null {
    if (rawValue === undefined || rawValue === null) {
      return null;
    }

    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Provider dispute external IDs must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length !== 36) {
      throw new DomainValidationError("Provider dispute IDs must be UUID values.");
    }

    return trimmed;
  }

  private static parseDisputeType(rawValue: string): ProviderDisputeType {
    if (rawValue === "settlement" || rawValue === "chargeback") {
      return rawValue;
    }

    throw new DomainValidationError(
      `Unsupported provider dispute type: ${rawValue}.`
    );
  }

  private static parseSource(rawValue: string): ProviderDisputeSource {
    if (rawValue === "manual" || rawValue === "stripe_webhook") {
      return rawValue;
    }

    throw new DomainValidationError(
      `Unsupported provider dispute source: ${rawValue}.`
    );
  }

  private static parseStatus(rawValue: string): ProviderDisputeStatus {
    if (
      rawValue === "open" ||
      rawValue === "under_review" ||
      rawValue === "won" ||
      rawValue === "lost" ||
      rawValue === "recovered" ||
      rawValue === "canceled"
    ) {
      return rawValue;
    }

    throw new DomainValidationError(
      `Unsupported provider dispute status: ${rawValue}.`
    );
  }

  private static assertValidTransition(
    currentStatus: ProviderDisputeStatus,
    nextStatus: ProviderDisputeStatus
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }

    const transitions: Record<
      ProviderDisputeStatus,
      readonly ProviderDisputeStatus[]
    > = {
      open: ["under_review", "won", "lost", "canceled"],
      under_review: ["won", "lost", "canceled"],
      won: [],
      lost: ["recovered"],
      recovered: [],
      canceled: []
    };

    if (!transitions[currentStatus].includes(nextStatus)) {
      throw new DomainValidationError(
        `Provider dispute status may not transition from ${currentStatus} to ${nextStatus}.`
      );
    }
  }

  private static isResolvedStatus(status: ProviderDisputeStatus): boolean {
    return status === "won" || status === "recovered" || status === "canceled";
  }

  private static coerceStripeStatus(
    status: ProviderDisputeStatus
  ): ProviderDisputeStatus {
    return status;
  }
}
