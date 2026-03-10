import { ProviderWarmModelState } from "./ProviderWarmModelState.js";

export interface ProviderNodeRoutingStateSnapshot {
  warmModelAliases: readonly {
    approvedModelAlias: string;
    declaredAt: string;
    expiresAt: string;
  }[];
}

export class ProviderNodeRoutingState {
  public constructor(
    public readonly warmModelAliases: readonly ProviderWarmModelState[]
  ) {}

  public static empty(): ProviderNodeRoutingState {
    return new ProviderNodeRoutingState([]);
  }

  public static rehydrate(input: {
    warmModelAliases: readonly {
      approvedModelAlias: string;
      declaredAt: Date;
      expiresAt: Date;
    }[];
  }): ProviderNodeRoutingState {
    return new ProviderNodeRoutingState(
      input.warmModelAliases.map((warmModelAlias) =>
        ProviderWarmModelState.rehydrate(warmModelAlias)
      )
    );
  }

  public findWarmModelAlias(
    approvedModelAlias: string,
    at: Date
  ): ProviderWarmModelState | null {
    const normalizedAlias = approvedModelAlias.trim();

    return (
      this.warmModelAliases.find(
        (warmModelAlias) =>
          warmModelAlias.approvedModelAlias === normalizedAlias &&
          !warmModelAlias.isExpired(at)
      ) ?? null
    );
  }

  public toSnapshot(): ProviderNodeRoutingStateSnapshot {
    return {
      warmModelAliases: this.warmModelAliases.map((warmModelAlias) =>
        warmModelAlias.toSnapshot()
      )
    };
  }
}
