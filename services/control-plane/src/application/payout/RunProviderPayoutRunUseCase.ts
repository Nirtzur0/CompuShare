import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderPayoutDisbursement } from "../../domain/payout/ProviderPayoutDisbursement.js";
import { ProviderPayoutRun } from "../../domain/payout/ProviderPayoutRun.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderPayoutRepository } from "./ports/ProviderPayoutRepository.js";
import type { StripeConnectClient } from "./ports/StripeConnectClient.js";

export interface RunProviderPayoutRunRequest {
  environment: string;
  providerOrganizationId?: string;
  dryRun?: boolean;
}

export class RunProviderPayoutRunUseCase {
  private static readonly MINIMUM_PAYOUT_AMOUNT_CENTS = 100;

  public constructor(
    private readonly repository: ProviderPayoutRepository,
    private readonly stripeConnectClient: StripeConnectClient,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(request: RunProviderPayoutRunRequest): Promise<{
    payoutRun: {
      id: string;
      environment: string;
      dryRun: boolean;
      status: "completed" | "failed";
      attemptedOrganizations: number;
      submittedDisbursements: number;
      skippedOrganizations: number;
      disbursements: readonly {
        providerOrganizationId: string;
        amountUsd: string;
        status: "pending" | "paid" | "failed" | "canceled" | "skipped";
        stripePayoutId: string | null;
        reason: string | null;
      }[];
    };
  }> {
    const occurredAt = this.clock();
    const run = ProviderPayoutRun.start({
      environment: request.environment,
      providerOrganizationIdFilter: request.providerOrganizationId ?? null,
      dryRun: request.dryRun !== false,
      startedAt: occurredAt
    });
    await this.repository.createProviderPayoutRun(run);
    await this.auditLog.record({
      eventName: "finance.payout_run.started",
      occurredAt: occurredAt.toISOString(),
      actorUserId: "00000000-0000-0000-0000-000000000001",
      organizationId:
        request.providerOrganizationId ??
        "00000000-0000-0000-0000-000000000000",
      metadata: {
        payoutRunId: run.id,
        environment: run.environment,
        dryRun: run.dryRun
      }
    });

    const providerOrganizationIds =
      await this.repository.listProviderOrganizationIds(
        request.providerOrganizationId === undefined
          ? {}
          : {
              providerOrganizationId: OrganizationId.create(
                request.providerOrganizationId
              )
            }
      );

    const results: {
      providerOrganizationId: string;
      amountUsd: string;
      status: "pending" | "paid" | "failed" | "canceled" | "skipped";
      stripePayoutId: string | null;
      reason: string | null;
    }[] = [];

    try {
      for (const providerOrganizationId of providerOrganizationIds) {
        const account =
          await this.repository.findProviderPayoutAccountByOrganizationId(
            OrganizationId.create(providerOrganizationId)
          );
        if (account === null) {
          results.push({
            providerOrganizationId,
            amountUsd: "0.00",
            status: "skipped",
            stripePayoutId: null,
            reason: "missing_payout_account"
          });
          continue;
        }

        const availability =
          await this.repository.getProviderPayoutAvailability(
            OrganizationId.create(providerOrganizationId)
          );
        if (!account.payoutsEnabled) {
          results.push({
            providerOrganizationId,
            amountUsd: availability.eligiblePayout.toUsdString(),
            status: "skipped",
            stripePayoutId: null,
            reason: "payouts_not_enabled"
          });
          continue;
        }

        if (
          availability.eligiblePayout.cents <
          RunProviderPayoutRunUseCase.MINIMUM_PAYOUT_AMOUNT_CENTS
        ) {
          results.push({
            providerOrganizationId,
            amountUsd: availability.eligiblePayout.toUsdString(),
            status: "skipped",
            stripePayoutId: null,
            reason: "below_minimum_payout"
          });
          continue;
        }

        if (run.dryRun) {
          results.push({
            providerOrganizationId,
            amountUsd: availability.eligiblePayout.toUsdString(),
            status: "skipped",
            stripePayoutId: null,
            reason: "dry_run"
          });
          continue;
        }

        const disbursement = ProviderPayoutDisbursement.createPending({
          payoutRunId: run.id,
          providerOrganizationId,
          stripeAccountId: account.stripeAccountId,
          idempotencyKey: `${run.id}:${providerOrganizationId}:${String(availability.eligiblePayout.cents)}`,
          amountCents: availability.eligiblePayout.cents,
          currency: account.defaultCurrency,
          createdAt: occurredAt
        });
        await this.repository.createProviderPayoutDisbursement(disbursement);
        const transfer = await this.stripeConnectClient.createTransfer({
          accountId: account.stripeAccountId,
          amountCents: disbursement.amount.cents,
          currency: disbursement.currency,
          idempotencyKey: `${disbursement.idempotencyKey}:transfer`
        });
        const payout = await this.stripeConnectClient.createPayout({
          accountId: account.stripeAccountId,
          amountCents: disbursement.amount.cents,
          currency: disbursement.currency,
          idempotencyKey: `${disbursement.idempotencyKey}:payout`
        });
        const submitted = disbursement.withStripeSubmission({
          stripeTransferId: transfer.transferId,
          stripePayoutId: payout.payoutId,
          updatedAt: occurredAt
        });
        await this.repository.updateProviderPayoutDisbursement(submitted);
        await this.auditLog.record({
          eventName: "finance.payout_disbursement.created",
          occurredAt: occurredAt.toISOString(),
          actorUserId: "00000000-0000-0000-0000-000000000001",
          organizationId: providerOrganizationId,
          metadata: {
            payoutRunId: run.id,
            payoutDisbursementId: submitted.id,
            stripeAccountId: submitted.stripeAccountId,
            stripeTransferId: submitted.stripeTransferId,
            stripePayoutId: submitted.stripePayoutId,
            amountUsd: submitted.amount.toUsdString()
          }
        });
        results.push({
          providerOrganizationId,
          amountUsd: submitted.amount.toUsdString(),
          status: "pending",
          stripePayoutId: submitted.stripePayoutId,
          reason: null
        });
      }

      const completedRun = run.complete(this.clock());
      await this.repository.updateProviderPayoutRun(completedRun);
      await this.auditLog.record({
        eventName: "finance.payout_run.completed",
        occurredAt: this.clock().toISOString(),
        actorUserId: "00000000-0000-0000-0000-000000000001",
        organizationId:
          request.providerOrganizationId ??
          "00000000-0000-0000-0000-000000000000",
        metadata: {
          payoutRunId: run.id,
          attemptedOrganizations: providerOrganizationIds.length,
          submittedDisbursements: results.filter(
            (item) => item.status === "pending"
          ).length,
          skippedOrganizations: results.filter(
            (item) => item.status === "skipped"
          ).length
        }
      });

      return {
        payoutRun: {
          id: run.id,
          environment: run.environment,
          dryRun: run.dryRun,
          status: "completed",
          attemptedOrganizations: providerOrganizationIds.length,
          submittedDisbursements: results.filter(
            (item) => item.status === "pending"
          ).length,
          skippedOrganizations: results.filter(
            (item) => item.status === "skipped"
          ).length,
          disbursements: results
        }
      };
    } catch (error) {
      await this.repository.updateProviderPayoutRun(run.fail(this.clock()));
      await this.auditLog.record({
        eventName: "finance.payout_run.failed",
        occurredAt: this.clock().toISOString(),
        actorUserId: "00000000-0000-0000-0000-000000000001",
        organizationId:
          request.providerOrganizationId ??
          "00000000-0000-0000-0000-000000000000",
        metadata: {
          payoutRunId: run.id,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Unknown payout run failure."
        }
      });
      throw error;
    }
  }
}
