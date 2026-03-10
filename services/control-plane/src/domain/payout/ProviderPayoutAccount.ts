import { OrganizationId } from "../identity/OrganizationId.js";

export type ProviderPayoutOnboardingStatus = "pending" | "completed";

export interface ProviderPayoutAccountSnapshot {
  organizationId: string;
  stripeAccountId: string;
  onboardingStatus: ProviderPayoutOnboardingStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country: string;
  defaultCurrency: string;
  requirementsCurrentlyDue: readonly string[];
  requirementsEventuallyDue: readonly string[];
  lastStripeSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export class ProviderPayoutAccount {
  private constructor(
    public readonly organizationId: OrganizationId,
    public readonly stripeAccountId: string,
    public readonly onboardingStatus: ProviderPayoutOnboardingStatus,
    public readonly chargesEnabled: boolean,
    public readonly payoutsEnabled: boolean,
    public readonly detailsSubmitted: boolean,
    public readonly country: string,
    public readonly defaultCurrency: string,
    public readonly requirementsCurrentlyDue: readonly string[],
    public readonly requirementsEventuallyDue: readonly string[],
    public readonly lastStripeSyncAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  public static create(input: {
    organizationId: string;
    stripeAccountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    country: string;
    defaultCurrency: string;
    requirementsCurrentlyDue: readonly string[];
    requirementsEventuallyDue: readonly string[];
    lastStripeSyncAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): ProviderPayoutAccount {
    return new ProviderPayoutAccount(
      OrganizationId.create(input.organizationId),
      input.stripeAccountId,
      deriveProviderPayoutOnboardingStatus({
        chargesEnabled: input.chargesEnabled,
        payoutsEnabled: input.payoutsEnabled,
        detailsSubmitted: input.detailsSubmitted
      }),
      input.chargesEnabled,
      input.payoutsEnabled,
      input.detailsSubmitted,
      input.country.toUpperCase(),
      input.defaultCurrency.toLowerCase(),
      [...input.requirementsCurrentlyDue].sort(),
      [...input.requirementsEventuallyDue].sort(),
      input.lastStripeSyncAt,
      input.createdAt,
      input.updatedAt
    );
  }

  public toSnapshot(): ProviderPayoutAccountSnapshot {
    return {
      organizationId: this.organizationId.value,
      stripeAccountId: this.stripeAccountId,
      onboardingStatus: this.onboardingStatus,
      chargesEnabled: this.chargesEnabled,
      payoutsEnabled: this.payoutsEnabled,
      detailsSubmitted: this.detailsSubmitted,
      country: this.country,
      defaultCurrency: this.defaultCurrency,
      requirementsCurrentlyDue: [...this.requirementsCurrentlyDue],
      requirementsEventuallyDue: [...this.requirementsEventuallyDue],
      lastStripeSyncAt: this.lastStripeSyncAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

function deriveProviderPayoutOnboardingStatus(input: {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}): ProviderPayoutOnboardingStatus {
  return input.chargesEnabled && input.payoutsEnabled && input.detailsSubmitted
    ? "completed"
    : "pending";
}
