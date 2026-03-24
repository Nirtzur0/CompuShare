import { canManageOrganizationFinances } from "../../domain/identity/OrganizationRole.js";
import type { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { UserId } from "../../domain/identity/UserId.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { ProviderDisputeRepository } from "./ports/ProviderDisputeRepository.js";

export class ProviderDisputeOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderDisputeOrganizationNotFoundError";
  }
}

export class ProviderDisputeBuyerCapabilityRequiredError extends Error {
  public constructor() {
    super("Organization must have buyer capability before managing disputes.");
    this.name = "ProviderDisputeBuyerCapabilityRequiredError";
  }
}

export class ProviderDisputeProviderCapabilityRequiredError extends Error {
  public constructor() {
    super("Organization must have provider capability for provider disputes.");
    this.name = "ProviderDisputeProviderCapabilityRequiredError";
  }
}

export class ProviderDisputeAuthorizationError extends Error {
  public constructor() {
    super("Only owner, admin, or finance members may manage disputes.");
    this.name = "ProviderDisputeAuthorizationError";
  }
}

export class ProviderDisputeCaseNotFoundError extends Error {
  public constructor(disputeId: string) {
    super(`Provider dispute "${disputeId}" was not found.`);
    this.name = "ProviderDisputeCaseNotFoundError";
  }
}

export class ProviderDisputePaymentReferenceNotFoundError extends Error {
  public constructor(paymentReference: string) {
    super(
      `Customer charge payment reference "${paymentReference}" was not found for the buyer organization.`,
    );
    this.name = "ProviderDisputePaymentReferenceNotFoundError";
  }
}

export class ProviderDisputeSettlementNotFoundError extends Error {
  public constructor(jobReference: string) {
    super(
      `Job settlement reference "${jobReference}" was not found for the buyer-provider pair.`,
    );
    this.name = "ProviderDisputeSettlementNotFoundError";
  }
}

export async function assertBuyerFinanceAccess(
  repository: Pick<
    ProviderDisputeRepository,
    "findOrganizationAccountCapabilities" | "findOrganizationMember"
  >,
  organizationId: OrganizationId,
  actorUserId: UserId,
): Promise<void> {
  const capabilities =
    await repository.findOrganizationAccountCapabilities(organizationId);

  if (capabilities === null) {
    throw new ProviderDisputeOrganizationNotFoundError(organizationId.value);
  }

  if (!hasCapability(capabilities, "buyer")) {
    throw new ProviderDisputeBuyerCapabilityRequiredError();
  }

  const membership = await repository.findOrganizationMember(
    organizationId,
    actorUserId,
  );

  if (membership === null || !canManageOrganizationFinances(membership.role)) {
    throw new ProviderDisputeAuthorizationError();
  }
}

export async function assertProviderCapability(
  repository: Pick<ProviderDisputeRepository, "findOrganizationAccountCapabilities">,
  organizationId: OrganizationId,
): Promise<void> {
  const capabilities =
    await repository.findOrganizationAccountCapabilities(organizationId);

  if (capabilities === null) {
    throw new ProviderDisputeOrganizationNotFoundError(organizationId.value);
  }

  if (!hasCapability(capabilities, "provider")) {
    throw new ProviderDisputeProviderCapabilityRequiredError();
  }
}

function hasCapability(
  capabilities: readonly AccountCapability[],
  expected: AccountCapability,
): boolean {
  return capabilities.includes(expected);
}
