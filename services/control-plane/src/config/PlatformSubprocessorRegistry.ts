import {
  PlatformSubprocessor,
  type PlatformSubprocessorSnapshot
} from "../domain/compliance/PlatformSubprocessor.js";

const registry: readonly PlatformSubprocessorSnapshot[] = [
  {
    vendorName: "Stripe",
    purpose: "Card billing, provider onboarding, and payouts where enabled",
    dataCategories: [
      "billing contact details",
      "transaction metadata",
      "provider payout onboarding details"
    ],
    regions: ["United States", "European Union"],
    transferMechanism: "Standard Contractual Clauses where required",
    activationCondition:
      "Only when customer billing or provider payout workflows are enabled.",
    status: "conditional",
    lastReviewedAt: "2026-03-10"
  }
];

export function loadPlatformSubprocessorRegistry(): PlatformSubprocessor[] {
  return registry.map((entry) => PlatformSubprocessor.create(entry));
}
