import { describe, expect, it } from "vitest";
import {
  assertBuyerFinanceAccess,
  assertProviderCapability,
  ProviderDisputeAuthorizationError,
  ProviderDisputeBuyerCapabilityRequiredError,
  ProviderDisputeOrganizationNotFoundError,
  ProviderDisputeProviderCapabilityRequiredError,
} from "../../../src/application/dispute/ProviderDisputeErrors.js";
import type { ProviderDisputeRepository } from "../../../src/application/dispute/ports/ProviderDisputeRepository.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { UserId } from "../../../src/domain/identity/UserId.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";

class InMemoryProviderDisputeRepository
  implements
    Pick<
      ProviderDisputeRepository,
      | "findOrganizationAccountCapabilities"
      | "findOrganizationMember"
      | "getActiveProviderDisputeHold"
      | "getProviderDisputeSummary"
      | "listRecentLostDisputeCountsByProviderOrganization"
    >
{
  public readonly capabilities = new Map<string, readonly ("buyer" | "provider")[]>();
  public readonly members = new Map<string, OrganizationMember>();

  public findOrganizationAccountCapabilities(organizationId: OrganizationId) {
    return Promise.resolve(this.capabilities.get(organizationId.value) ?? null);
  }

  public findOrganizationMember(organizationId: OrganizationId, userId: UserId) {
    return Promise.resolve(
      this.members.get(`${organizationId.value}:${userId.value}`) ?? null,
    );
  }

  public getActiveProviderDisputeHold(): Promise<UsdAmount> {
    return Promise.resolve(UsdAmount.zero());
  }

  public getProviderDisputeSummary(): Promise<{
    activeDisputeCount: number;
    activeDisputeHold: UsdAmount;
    recentLostDisputeCount: number;
  }> {
    return Promise.resolve({
      activeDisputeCount: 0,
      activeDisputeHold: UsdAmount.zero(),
      recentLostDisputeCount: 0,
    });
  }

  public listRecentLostDisputeCountsByProviderOrganization(): Promise<
    readonly {
      providerOrganizationId: string;
      lostDisputeCount: number;
    }[]
  > {
    return Promise.resolve([]);
  }
}

function seedRepository(): InMemoryProviderDisputeRepository {
  const repository = new InMemoryProviderDisputeRepository();
  repository.capabilities.set("buyer-org", ["buyer"]);
  repository.capabilities.set("provider-org", ["provider"]);
  repository.members.set(
    "buyer-org:buyer-user",
    OrganizationMember.rehydrate({
      userId: "buyer-user",
      role: "finance",
      joinedAt: new Date("2026-03-10T09:00:00.000Z"),
    }),
  );
  return repository;
}

describe("ProviderDisputeErrors", () => {
  it("authorizes buyer finance members only for buyer-capable organizations", async () => {
    const repository = seedRepository();

    await expect(
      assertBuyerFinanceAccess(
        repository,
        OrganizationId.create("buyer-org"),
        UserId.create("buyer-user"),
      ),
    ).resolves.toBeUndefined();

    repository.members.set(
      "buyer-org:buyer-user",
      OrganizationMember.rehydrate({
        userId: "buyer-user",
        role: "developer",
        joinedAt: new Date("2026-03-10T09:00:00.000Z"),
      }),
    );
    await expect(
      assertBuyerFinanceAccess(
        repository,
        OrganizationId.create("buyer-org"),
        UserId.create("buyer-user"),
      ),
    ).rejects.toBeInstanceOf(ProviderDisputeAuthorizationError);

    repository.capabilities.set("buyer-org", ["provider"]);
    await expect(
      assertBuyerFinanceAccess(
        repository,
        OrganizationId.create("buyer-org"),
        UserId.create("buyer-user"),
      ),
    ).rejects.toBeInstanceOf(ProviderDisputeBuyerCapabilityRequiredError);

    repository.capabilities.delete("buyer-org");
    await expect(
      assertBuyerFinanceAccess(
        repository,
        OrganizationId.create("buyer-org"),
        UserId.create("buyer-user"),
      ),
    ).rejects.toBeInstanceOf(ProviderDisputeOrganizationNotFoundError);
  });

  it("requires provider capability for provider dispute allocations", async () => {
    const repository = seedRepository();

    await expect(
      assertProviderCapability(repository, OrganizationId.create("provider-org")),
    ).resolves.toBeUndefined();

    repository.capabilities.set("provider-org", ["buyer"]);
    await expect(
      assertProviderCapability(repository, OrganizationId.create("provider-org")),
    ).rejects.toBeInstanceOf(ProviderDisputeProviderCapabilityRequiredError);

    repository.capabilities.delete("provider-org");
    await expect(
      assertProviderCapability(repository, OrganizationId.create("provider-org")),
    ).rejects.toBeInstanceOf(ProviderDisputeOrganizationNotFoundError);
  });
});
