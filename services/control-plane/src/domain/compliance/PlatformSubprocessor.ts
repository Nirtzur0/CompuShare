export type PlatformSubprocessorStatus = "active" | "conditional";

export interface PlatformSubprocessorSnapshot {
  vendorName: string;
  purpose: string;
  dataCategories: string[];
  regions: string[];
  transferMechanism: string;
  activationCondition: string | null;
  status: PlatformSubprocessorStatus;
  lastReviewedAt: string;
}

export class PlatformSubprocessor {
  private constructor(
    private readonly snapshot: PlatformSubprocessorSnapshot
  ) {}

  public static create(
    snapshot: PlatformSubprocessorSnapshot
  ): PlatformSubprocessor {
    return new PlatformSubprocessor({
      ...snapshot,
      dataCategories: [...snapshot.dataCategories],
      regions: [...snapshot.regions]
    });
  }

  public toSnapshot(): PlatformSubprocessorSnapshot {
    return {
      ...this.snapshot,
      dataCategories: [...this.snapshot.dataCategories],
      regions: [...this.snapshot.regions]
    };
  }
}
