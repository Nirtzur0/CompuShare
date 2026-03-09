import type { EmailAddress } from "../../../domain/identity/EmailAddress.js";
import type { Organization } from "../../../domain/identity/Organization.js";
import type { OrganizationSlug } from "../../../domain/identity/OrganizationSlug.js";
import type { User } from "../../../domain/identity/User.js";

export interface OrganizationProvisioningRepository {
  findUserByEmail(email: EmailAddress): Promise<User | null>;
  organizationSlugExists(slug: OrganizationSlug): Promise<boolean>;
  createOrganization(organization: Organization, founder: User): Promise<User>;
}
