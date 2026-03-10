export interface ProviderNodeAttestationPolicySnapshot {
  challengeTtlMinutes: number;
  freshnessHours: number;
  requireSecureBoot: boolean;
  allowedPcrValues: Record<string, readonly string[]>;
}

export class ProviderNodeAttestationPolicy {
  private constructor(
    public readonly challengeTtlMinutes: number,
    public readonly freshnessHours: number,
    public readonly requireSecureBoot: boolean,
    public readonly allowedPcrValues: Readonly<
      Record<string, readonly string[]>
    >
  ) {}

  public static createDefault(): ProviderNodeAttestationPolicy {
    return new ProviderNodeAttestationPolicy(5, 24, true, {
      "0": ["1111111111111111111111111111111111111111111111111111111111111111"],
      "2": ["2222222222222222222222222222222222222222222222222222222222222222"],
      "4": ["4444444444444444444444444444444444444444444444444444444444444444"],
      "7": ["7777777777777777777777777777777777777777777777777777777777777777"]
    });
  }

  public toSnapshot(): ProviderNodeAttestationPolicySnapshot {
    return {
      challengeTtlMinutes: this.challengeTtlMinutes,
      freshnessHours: this.freshnessHours,
      requireSecureBoot: this.requireSecureBoot,
      allowedPcrValues: { ...this.allowedPcrValues }
    };
  }
}
