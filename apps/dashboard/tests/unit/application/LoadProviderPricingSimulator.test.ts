import { describe, expect, it, vi } from "vitest";
import { LoadProviderPricingSimulator } from "../../../src/application/provider/LoadProviderPricingSimulator.js";
import { ProviderPricingSimulator } from "../../../src/domain/provider/ProviderPricingSimulator.js";

describe("LoadProviderPricingSimulator", () => {
  it("delegates to the control-plane client with the requested identifiers", async () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "org-123",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 0,
      assumptions: {
        usageObservationDays: 7,
        settlementEconomicsDays: 30,
        projectionDays: 30,
        netProjectionStatus: "available",
        settlementCount: 1,
        realizedPlatformFeePercent: 12,
        realizedReserveHoldbackPercent: 4,
        realizedWithdrawablePercent: 84,
      },
      nodes: [],
    });
    const getProviderPricingSimulator = vi.fn(() => Promise.resolve(simulator));

    const useCase = new LoadProviderPricingSimulator({
      getProviderPricingSimulator,
    });
    const result = await useCase.execute({
      organizationId: "org-123",
      actorUserId: "user-123",
    });

    expect(result).toBe(simulator);
    expect(getProviderPricingSimulator).toHaveBeenCalledWith({
      organizationId: "org-123",
      actorUserId: "user-123",
    });
  });
});
