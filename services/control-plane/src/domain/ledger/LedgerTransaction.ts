import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import { UserId } from "../identity/UserId.js";
import type { LedgerPosting, LedgerPostingSnapshot } from "./LedgerPosting.js";

export const ledgerTransactionTypeValues = [
  "customer_charge",
  "job_settlement"
] as const;

export type LedgerTransactionType =
  (typeof ledgerTransactionTypeValues)[number];

export interface LedgerTransactionSnapshot {
  id: string;
  organizationId: string;
  transactionType: LedgerTransactionType;
  reference: string;
  createdByUserId: string;
  occurredAt: string;
  postings: LedgerPostingSnapshot[];
}

export class LedgerTransaction {
  private constructor(
    public readonly id: string,
    public readonly organizationId: OrganizationId,
    public readonly transactionType: LedgerTransactionType,
    public readonly reference: string,
    public readonly createdByUserId: UserId,
    public readonly occurredAt: Date,
    public readonly postings: readonly LedgerPosting[]
  ) {}

  public static record(input: {
    id?: string;
    organizationId: string;
    transactionType: LedgerTransactionType;
    reference: string;
    createdByUserId: string;
    occurredAt: Date;
    postings: readonly LedgerPosting[];
  }): LedgerTransaction {
    const reference = input.reference.trim();

    if (reference.length < 3 || reference.length > 120) {
      throw new DomainValidationError(
        "Ledger transaction references must be between 3 and 120 characters."
      );
    }

    if (input.postings.length < 2) {
      throw new DomainValidationError(
        "Ledger transactions require at least two postings."
      );
    }

    let debitTotalCents = 0;
    let creditTotalCents = 0;

    for (const posting of input.postings) {
      if (posting.direction === "debit") {
        debitTotalCents += posting.amount.cents;
      } else {
        creditTotalCents += posting.amount.cents;
      }
    }

    if (debitTotalCents !== creditTotalCents) {
      throw new DomainValidationError(
        "Ledger transactions must remain balanced across debit and credit postings."
      );
    }

    return new LedgerTransaction(
      input.id ?? randomUUID(),
      OrganizationId.create(input.organizationId),
      input.transactionType,
      reference,
      UserId.create(input.createdByUserId),
      input.occurredAt,
      [...input.postings]
    );
  }

  public toSnapshot(): LedgerTransactionSnapshot {
    return {
      id: this.id,
      organizationId: this.organizationId.value,
      transactionType: this.transactionType,
      reference: this.reference,
      createdByUserId: this.createdByUserId.value,
      occurredAt: this.occurredAt.toISOString(),
      postings: this.postings.map((posting) => posting.toSnapshot())
    };
  }
}
