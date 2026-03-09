import { EmailAddress } from "../../domain/identity/EmailAddress.js";
import { Organization } from "../../domain/identity/Organization.js";
import { OrganizationSlug } from "../../domain/identity/OrganizationSlug.js";
import { User } from "../../domain/identity/User.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationProvisioningRepository } from "./ports/OrganizationProvisioningRepository.js";

export interface CreateOrganizationRequest {
  organizationName: string;
  organizationSlug: string;
  founderEmail: string;
  founderDisplayName: string;
  accountCapabilities: readonly string[];
}

export interface CreateOrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    accountCapabilities: string[];
    createdAt: string;
  };
  founder: {
    userId: string;
    email: string;
    displayName: string;
    role: "owner";
  };
}

export class OrganizationSlugConflictError extends Error {
  public constructor(slug: string) {
    super(`Organization slug "${slug}" is already in use.`);
    this.name = "OrganizationSlugConflictError";
  }
}

export class CreateOrganizationUseCase {
  public constructor(
    private readonly repository: OrganizationProvisioningRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: CreateOrganizationRequest
  ): Promise<CreateOrganizationResponse> {
    const requestedAt = this.clock();
    const organizationSlug = OrganizationSlug.create(request.organizationSlug);

    if (await this.repository.organizationSlugExists(organizationSlug)) {
      throw new OrganizationSlugConflictError(organizationSlug.value);
    }

    const founderEmail = EmailAddress.create(request.founderEmail);
    const existingFounder = await this.repository.findUserByEmail(founderEmail);
    const founder =
      existingFounder ??
      User.createNew({
        email: founderEmail,
        displayName: request.founderDisplayName,
        createdAt: requestedAt
      });

    const organization = Organization.createNew({
      name: request.organizationName,
      slug: organizationSlug,
      accountCapabilities: request.accountCapabilities,
      founder,
      createdAt: requestedAt
    });

    const persistedFounder = await this.repository.createOrganization(
      organization,
      founder
    );

    await this.auditLog.record({
      eventName: "identity.organization.created",
      occurredAt: requestedAt.toISOString(),
      actorUserId: persistedFounder.id.value,
      organizationId: organization.id.value,
      metadata: {
        accountCapabilities: organization.accountProfile.toArray(),
        organizationSlug: organization.slug.value
      }
    });

    return {
      organization: {
        id: organization.id.value,
        name: organization.name.value,
        slug: organization.slug.value,
        accountCapabilities: organization.accountProfile.toArray(),
        createdAt: organization.createdAt.toISOString()
      },
      founder: {
        userId: persistedFounder.id.value,
        email: persistedFounder.email.value,
        displayName: persistedFounder.displayName,
        role: "owner"
      }
    };
  }
}
