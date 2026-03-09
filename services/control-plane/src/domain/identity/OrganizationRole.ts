import { DomainValidationError } from "./DomainValidationError.js";

export const organizationRoleValues = [
  "owner",
  "admin",
  "developer",
  "finance"
] as const;

export type OrganizationRole = (typeof organizationRoleValues)[number];

export function parseOrganizationRole(rawValue: string): OrganizationRole {
  if (organizationRoleValues.includes(rawValue as OrganizationRole)) {
    return rawValue as OrganizationRole;
  }

  throw new DomainValidationError(
    `Unsupported organization role: ${rawValue}.`
  );
}

export function canManageOrganizationMembers(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageOrganizationFinances(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}

export function canViewProviderDashboard(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}

export function canViewConsumerDashboard(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}

export function canMutateOrganizationRole(input: {
  actorRole: OrganizationRole;
  targetCurrentRole: OrganizationRole;
  nextRole: OrganizationRole;
}): boolean {
  if (!canManageOrganizationMembers(input.actorRole)) {
    return false;
  }

  if (input.actorRole === "admin") {
    if (input.targetCurrentRole === "owner") {
      return false;
    }

    return input.nextRole !== "owner";
  }

  return true;
}
