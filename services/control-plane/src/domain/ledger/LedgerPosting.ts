import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import {
  parseLedgerAccountCode,
  type LedgerAccountCode
} from "./LedgerAccountCode.js";
import type { UsdAmount } from "./UsdAmount.js";

export const ledgerPostingDirectionValues = ["debit", "credit"] as const;

export type LedgerPostingDirection =
  (typeof ledgerPostingDirectionValues)[number];

export interface LedgerPostingSnapshot {
  accountCode: LedgerAccountCode;
  direction: LedgerPostingDirection;
  amountUsd: string;
  organizationId: string | null;
}

export class LedgerPosting {
  private constructor(
    public readonly accountCode: LedgerAccountCode,
    public readonly direction: LedgerPostingDirection,
    public readonly amount: UsdAmount,
    public readonly organizationId: OrganizationId | null
  ) {}

  public static create(input: {
    accountCode: string;
    direction: string;
    amount: UsdAmount;
    organizationId?: string | null;
  }): LedgerPosting {
    if (!ledgerPostingDirectionValues.includes(input.direction as never)) {
      throw new DomainValidationError(
        `Unsupported ledger posting direction: ${input.direction}.`
      );
    }

    if (input.amount.cents === 0) {
      throw new DomainValidationError(
        "Ledger postings must carry a positive USD amount."
      );
    }

    return new LedgerPosting(
      parseLedgerAccountCode(input.accountCode),
      input.direction as LedgerPostingDirection,
      input.amount,
      input.organizationId === undefined || input.organizationId === null
        ? null
        : OrganizationId.create(input.organizationId)
    );
  }

  public toSnapshot(): LedgerPostingSnapshot {
    return {
      accountCode: this.accountCode,
      direction: this.direction,
      amountUsd: this.amount.toUsdString(),
      organizationId: this.organizationId?.value ?? null
    };
  }
}
