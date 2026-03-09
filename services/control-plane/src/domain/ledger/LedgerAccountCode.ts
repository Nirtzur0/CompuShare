import { DomainValidationError } from "../identity/DomainValidationError.js";

export const ledgerAccountCodeValues = [
  "platform_cash_clearing",
  "customer_prepaid_cash_liability",
  "customer_promotional_credit_liability",
  "provider_payable",
  "platform_revenue",
  "risk_reserve",
  "tax_liability",
  "provider_spend_balance_liability"
] as const;

export type LedgerAccountCode = (typeof ledgerAccountCodeValues)[number];

export function parseLedgerAccountCode(rawValue: string): LedgerAccountCode {
  if (ledgerAccountCodeValues.includes(rawValue as LedgerAccountCode)) {
    return rawValue as LedgerAccountCode;
  }

  throw new DomainValidationError(
    `Unsupported ledger account code: ${rawValue}.`
  );
}
