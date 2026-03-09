export class LedgerOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "LedgerOrganizationNotFoundError";
  }
}

export class OrganizationFinanceAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may manage organization finances."
    );
    this.name = "OrganizationFinanceAuthorizationError";
  }
}

export class BuyerCapabilityRequiredError extends Error {
  public constructor() {
    super("Organization must have buyer capability before recording charges.");
    this.name = "BuyerCapabilityRequiredError";
  }
}

export class ProviderCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before receiving settled earnings."
    );
    this.name = "ProviderCapabilityRequiredError";
  }
}

export class LedgerInsufficientPrepaidBalanceError extends Error {
  public constructor(requestedAmountUsd: string, availableAmountUsd: string) {
    super(
      `Settlement amount ${requestedAmountUsd} exceeds available prepaid balance ${availableAmountUsd}.`
    );
    this.name = "LedgerInsufficientPrepaidBalanceError";
  }
}
