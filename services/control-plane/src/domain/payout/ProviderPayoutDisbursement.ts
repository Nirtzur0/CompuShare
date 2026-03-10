import { randomUUID } from "node:crypto";
import { OrganizationId } from "../identity/OrganizationId.js";
import { UsdAmount } from "../ledger/UsdAmount.js";

export type ProviderPayoutDisbursementStatus =
  | "pending"
  | "paid"
  | "failed"
  | "canceled";

export interface ProviderPayoutDisbursementSnapshot {
  id: string;
  payoutRunId: string;
  providerOrganizationId: string;
  stripeAccountId: string;
  stripeTransferId: string | null;
  stripePayoutId: string | null;
  idempotencyKey: string;
  amountUsd: string;
  currency: string;
  status: ProviderPayoutDisbursementStatus;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
}

export class ProviderPayoutDisbursement {
  private constructor(
    public readonly id: string,
    public readonly payoutRunId: string,
    public readonly providerOrganizationId: OrganizationId,
    public readonly stripeAccountId: string,
    public readonly stripeTransferId: string | null,
    public readonly stripePayoutId: string | null,
    public readonly idempotencyKey: string,
    public readonly amount: UsdAmount,
    public readonly currency: string,
    public readonly status: ProviderPayoutDisbursementStatus,
    public readonly failureCode: string | null,
    public readonly failureMessage: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly paidAt: Date | null,
    public readonly failedAt: Date | null,
    public readonly canceledAt: Date | null
  ) {}

  public static createPending(input: {
    payoutRunId: string;
    providerOrganizationId: string;
    stripeAccountId: string;
    idempotencyKey: string;
    amountCents: number;
    currency: string;
    createdAt: Date;
  }): ProviderPayoutDisbursement {
    return new ProviderPayoutDisbursement(
      randomUUID(),
      input.payoutRunId,
      OrganizationId.create(input.providerOrganizationId),
      input.stripeAccountId,
      null,
      null,
      input.idempotencyKey,
      UsdAmount.createFromCents(input.amountCents),
      input.currency.toLowerCase(),
      "pending",
      null,
      null,
      input.createdAt,
      input.createdAt,
      null,
      null,
      null
    );
  }

  public static rehydrate(input: {
    id: string;
    payoutRunId: string;
    providerOrganizationId: string;
    stripeAccountId: string;
    stripeTransferId: string | null;
    stripePayoutId: string | null;
    idempotencyKey: string;
    amountCents: number;
    currency: string;
    status: ProviderPayoutDisbursementStatus;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    paidAt: Date | null;
    failedAt: Date | null;
    canceledAt: Date | null;
  }): ProviderPayoutDisbursement {
    return new ProviderPayoutDisbursement(
      input.id,
      input.payoutRunId,
      OrganizationId.create(input.providerOrganizationId),
      input.stripeAccountId,
      input.stripeTransferId,
      input.stripePayoutId,
      input.idempotencyKey,
      UsdAmount.createFromCents(input.amountCents),
      input.currency.toLowerCase(),
      input.status,
      input.failureCode,
      input.failureMessage,
      input.createdAt,
      input.updatedAt,
      input.paidAt,
      input.failedAt,
      input.canceledAt
    );
  }

  public withStripeSubmission(input: {
    stripeTransferId: string;
    stripePayoutId: string;
    updatedAt: Date;
  }): ProviderPayoutDisbursement {
    return new ProviderPayoutDisbursement(
      this.id,
      this.payoutRunId,
      this.providerOrganizationId,
      this.stripeAccountId,
      input.stripeTransferId,
      input.stripePayoutId,
      this.idempotencyKey,
      this.amount,
      this.currency,
      this.status,
      this.failureCode,
      this.failureMessage,
      this.createdAt,
      input.updatedAt,
      this.paidAt,
      this.failedAt,
      this.canceledAt
    );
  }

  public withStatus(input: {
    status: ProviderPayoutDisbursementStatus;
    updatedAt: Date;
    failureCode?: string | null;
    failureMessage?: string | null;
    paidAt?: Date | null;
    failedAt?: Date | null;
    canceledAt?: Date | null;
  }): ProviderPayoutDisbursement {
    return new ProviderPayoutDisbursement(
      this.id,
      this.payoutRunId,
      this.providerOrganizationId,
      this.stripeAccountId,
      this.stripeTransferId,
      this.stripePayoutId,
      this.idempotencyKey,
      this.amount,
      this.currency,
      input.status,
      input.failureCode ?? null,
      input.failureMessage ?? null,
      this.createdAt,
      input.updatedAt,
      input.paidAt ?? null,
      input.failedAt ?? null,
      input.canceledAt ?? null
    );
  }

  public toSnapshot(): ProviderPayoutDisbursementSnapshot {
    return {
      id: this.id,
      payoutRunId: this.payoutRunId,
      providerOrganizationId: this.providerOrganizationId.value,
      stripeAccountId: this.stripeAccountId,
      stripeTransferId: this.stripeTransferId,
      stripePayoutId: this.stripePayoutId,
      idempotencyKey: this.idempotencyKey,
      amountUsd: this.amount.toUsdString(),
      currency: this.currency,
      status: this.status,
      failureCode: this.failureCode,
      failureMessage: this.failureMessage,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      paidAt: this.paidAt?.toISOString() ?? null,
      failedAt: this.failedAt?.toISOString() ?? null,
      canceledAt: this.canceledAt?.toISOString() ?? null
    };
  }
}
