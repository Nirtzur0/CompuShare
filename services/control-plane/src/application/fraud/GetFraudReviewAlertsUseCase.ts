import type { FraudDetectionPolicy } from "../../config/FraudDetectionPolicy.js";
import { FraudReviewAlert } from "../../domain/fraud/FraudReviewAlert.js";
import type { FraudGraphCounterpartyExposure } from "../../domain/fraud/FraudGraphCounterpartyExposure.js";
import { canManageOrganizationFinances } from "../../domain/identity/OrganizationRole.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import { UsdAmount } from "../../domain/ledger/UsdAmount.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { FraudReviewRepository } from "./ports/FraudReviewRepository.js";

export interface GetFraudReviewAlertsRequest {
  organizationId: string;
  actorUserId: string;
  lookbackDays?: number;
}

export interface GetFraudReviewAlertsResponse {
  graph: {
    scannedAt: string;
    lookbackDays: number;
    counterpartyCount: number;
    outgoingSettledUsd: string;
    incomingSettledUsd: string;
    alertCount: number;
    highSeverityAlertCount: number;
  };
  alerts: ReturnType<FraudReviewAlert["toSnapshot"]>[];
}

export class FraudReviewOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "FraudReviewOrganizationNotFoundError";
  }
}

export class FraudReviewAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may review organization fraud alerts."
    );
    this.name = "FraudReviewAuthorizationError";
  }
}

export class GetFraudReviewAlertsUseCase {
  public constructor(
    private readonly repository: FraudReviewRepository,
    private readonly auditLog: AuditLog,
    private readonly policy: FraudDetectionPolicy,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GetFraudReviewAlertsRequest
  ): Promise<GetFraudReviewAlertsResponse> {
    const scannedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const lookbackDays = this.policy.resolveLookbackDays(request.lookbackDays);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new FraudReviewOrganizationNotFoundError(organizationId.value);
    }

    const membership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      membership === null ||
      !canManageOrganizationFinances(membership.role)
    ) {
      throw new FraudReviewAuthorizationError();
    }

    const startDateInclusive = new Date(scannedAt);
    startDateInclusive.setUTCDate(startDateInclusive.getUTCDate() - lookbackDays);

    const exposures = await this.repository.listFraudGraphCounterpartyExposures({
      organizationId,
      startDateInclusive,
      endDateExclusive: scannedAt
    });

    const totals = this.computeTotals(exposures);
    const alerts = this.buildAlerts({
      organizationId: organizationId.value,
      exposures,
      totalOutgoingSettledCents: totals.outgoingSettledCents,
      totalIncomingSettledCents: totals.incomingSettledCents
    });
    const snapshots = alerts.map((alert) => alert.toSnapshot());

    await this.auditLog.record({
      eventName: "risk.fraud_review.scanned",
      occurredAt: scannedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        lookbackDays,
        counterpartyCount: exposures.length,
        alertCount: snapshots.length,
        highSeverityAlertCount: snapshots.filter(
          (alert) => alert.severity === "high"
        ).length,
        signalTypes: [...new Set(snapshots.map((alert) => alert.signalType))]
      }
    });

    return {
      graph: {
        scannedAt: scannedAt.toISOString(),
        lookbackDays,
        counterpartyCount: exposures.length,
        outgoingSettledUsd: UsdAmount.createFromCents(
          totals.outgoingSettledCents
        ).toUsdString(),
        incomingSettledUsd: UsdAmount.createFromCents(
          totals.incomingSettledCents
        ).toUsdString(),
        alertCount: snapshots.length,
        highSeverityAlertCount: snapshots.filter(
          (alert) => alert.severity === "high"
        ).length
      },
      alerts: snapshots
    };
  }

  private computeTotals(
    exposures: readonly FraudGraphCounterpartyExposure[]
  ): {
    outgoingSettledCents: number;
    incomingSettledCents: number;
  } {
    return exposures.reduce(
      (current, exposure) => ({
        outgoingSettledCents:
          current.outgoingSettledCents + exposure.outgoingSettled.cents,
        incomingSettledCents:
          current.incomingSettledCents + exposure.incomingSettled.cents
      }),
      {
        outgoingSettledCents: 0,
        incomingSettledCents: 0
      }
    );
  }

  private buildAlerts(input: {
    organizationId: string;
    exposures: readonly FraudGraphCounterpartyExposure[];
    totalOutgoingSettledCents: number;
    totalIncomingSettledCents: number;
  }): FraudReviewAlert[] {
    const alerts: FraudReviewAlert[] = [];

    for (const exposure of input.exposures) {
      const snapshot = exposure.toSnapshot();
      const basePayload = {
        organizationId: input.organizationId,
        counterpartyOrganizationId: snapshot.counterpartyOrganizationId,
        counterpartyOrganizationName: snapshot.counterpartyOrganizationName,
        counterpartyOrganizationSlug: snapshot.counterpartyOrganizationSlug,
        sharedMemberEmails: snapshot.sharedMemberEmails,
        outgoingSettlementCount: snapshot.outgoingSettlementCount,
        outgoingSettledUsd: snapshot.outgoingSettledUsd,
        outgoingUsageEventCount: snapshot.outgoingUsageEventCount,
        outgoingUsageTotalTokens: snapshot.outgoingUsageTotalTokens,
        incomingSettlementCount: snapshot.incomingSettlementCount,
        incomingSettledUsd: snapshot.incomingSettledUsd,
        incomingUsageEventCount: snapshot.incomingUsageEventCount,
        incomingUsageTotalTokens: snapshot.incomingUsageTotalTokens,
        firstActivityAt: snapshot.firstActivityAt,
        lastActivityAt: snapshot.lastActivityAt
      };

      if (snapshot.counterpartyOrganizationId === input.organizationId) {
        alerts.push(
          FraudReviewAlert.create({
            ...basePayload,
            signalType: "self_settlement",
            severity: "high",
            reason:
              "Organization is both buyer and provider on settled activity in the scan window."
          })
        );
      }

      if (
        snapshot.sharedMemberEmails.length > 0 &&
        (exposure.outgoingSettlementCount > 0 || exposure.incomingSettlementCount > 0)
      ) {
        alerts.push(
          FraudReviewAlert.create({
            ...basePayload,
            signalType: "shared_member_settlement",
            severity: "high",
            reason: `Counterparty shares ${String(snapshot.sharedMemberEmails.length)} member identity signal(s) with the scanned organization.`
          })
        );
      }

      if (
        (exposure.outgoingSettlementCount > 0 &&
          exposure.outgoingSettled.cents >=
            this.policy.minimumSettledUsdForMissingUsageCents &&
          exposure.outgoingUsageEventCount === 0) ||
        (exposure.incomingSettlementCount > 0 &&
          exposure.incomingSettled.cents >=
            this.policy.minimumSettledUsdForMissingUsageCents &&
          exposure.incomingUsageEventCount === 0)
      ) {
        alerts.push(
          FraudReviewAlert.create({
            ...basePayload,
            signalType: "settlement_without_usage",
            severity: "medium",
            reason:
              "Settled value exists for this counterparty edge without matching gateway usage events in the same scan window."
          })
        );
      }

      const outgoingShare =
        input.totalOutgoingSettledCents === 0
          ? 0
          : exposure.outgoingSettled.cents / input.totalOutgoingSettledCents;
      const incomingShare =
        input.totalIncomingSettledCents === 0
          ? 0
          : exposure.incomingSettled.cents / input.totalIncomingSettledCents;

      if (
        (input.totalOutgoingSettledCents >=
          this.policy.minimumSettledUsdForConcentrationCents &&
          exposure.outgoingSettlementCount >=
            this.policy.minimumSettlementCountForConcentration &&
          outgoingShare >= this.policy.counterpartyShareThreshold) ||
        (input.totalIncomingSettledCents >=
          this.policy.minimumSettledUsdForConcentrationCents &&
          exposure.incomingSettlementCount >=
            this.policy.minimumSettlementCountForConcentration &&
          incomingShare >= this.policy.counterpartyShareThreshold)
      ) {
        alerts.push(
          FraudReviewAlert.create({
            ...basePayload,
            signalType: "counterparty_concentration",
            severity: "medium",
            reason:
              "One counterparty dominates settled activity for this organization in the scan window."
          })
        );
      }
    }

    return alerts.sort((left, right) => {
      const severityDiff =
        this.severityWeight(left.toSnapshot().severity) -
        this.severityWeight(right.toSnapshot().severity);

      if (severityDiff !== 0) {
        return severityDiff;
      }

      const leftSnapshot = left.toSnapshot();
      const rightSnapshot = right.toSnapshot();
      const signalDiff = leftSnapshot.signalType.localeCompare(
        rightSnapshot.signalType
      );

      if (signalDiff !== 0) {
        return signalDiff;
      }

      return leftSnapshot.counterpartyOrganizationId.localeCompare(
        rightSnapshot.counterpartyOrganizationId
      );
    });
  }

  private severityWeight(severity: "high" | "medium"): number {
    return severity === "high" ? 0 : 1;
  }
}
