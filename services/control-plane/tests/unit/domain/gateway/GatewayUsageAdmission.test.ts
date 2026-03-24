import { describe, expect, it } from "vitest";
import {
  GatewayUsageAdmission,
  type GatewayUsageAdmissionRequestSource,
  type GatewayUsageRequestKind
} from "../../../../src/domain/gateway/GatewayUsageAdmission.js";
import { DomainValidationError } from "../../../../src/domain/identity/DomainValidationError.js";

const baseInput = {
  organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
  environment: "production",
  apiKeyScopeId: "d3939649-841a-4f95-b2fa-b13d464f0d43",
  requestKind: "chat.completions" as const,
  requestSource: "interactive" as const,
  estimatedTotalTokens: 120,
  createdAt: new Date("2026-03-20T12:00:00.000Z")
};

describe("GatewayUsageAdmission", () => {
  it("reserves admissions and round-trips snapshots", () => {
    const reserved = GatewayUsageAdmission.reserve(baseInput);
    const settled = reserved.settle(240, new Date("2026-03-20T12:01:00.000Z"));
    const rehydrated = GatewayUsageAdmission.rehydrate(settled.toSnapshot());

    expect(rehydrated.toSnapshot()).toEqual(settled.toSnapshot());
  });

  it("rehydrates released admissions with trimmed release reasons", () => {
    const rehydrated = GatewayUsageAdmission.rehydrate({
      id: "8de9922f-7437-41d2-b6ca-c76d6d89df3b",
      organizationId: baseInput.organizationId,
      environment: "staging",
      apiKeyScopeId: baseInput.apiKeyScopeId,
      requestKind: "embeddings",
      requestSource: "batch_worker",
      estimatedTotalTokens: 64,
      actualTotalTokens: null,
      createdAt: "2026-03-20T12:00:00.000Z",
      settledAt: null,
      releasedAt: "2026-03-20T12:02:00.000Z",
      releaseReason: "  quota_reset  "
    });

    expect(rehydrated.toSnapshot()).toMatchObject({
      environment: "staging",
      requestKind: "embeddings",
      requestSource: "batch_worker",
      releasedAt: "2026-03-20T12:02:00.000Z",
      releaseReason: "quota_reset"
    });
  });

  it.each([
    {
      label: "invalid api key scope id",
      apply: () => ({ apiKeyScopeId: "not-a-uuid" }),
      message: "Gateway admission scope IDs must be valid UUIDs."
    },
    {
      label: "invalid request kind",
      apply: () => ({ requestKind: "images" as GatewayUsageRequestKind }),
      message:
        "Gateway admission request kind must be chat.completions or embeddings."
    },
    {
      label: "invalid request source",
      apply: () =>
        ({ requestSource: "scheduler" as GatewayUsageAdmissionRequestSource }),
      message:
        "Gateway admission request source must be interactive or batch_worker."
    },
    {
      label: "negative estimated tokens",
      apply: () => ({ estimatedTotalTokens: -1 }),
      message: "Estimated token counts must be non-negative safe integers."
    }
  ])("rejects $label during reserve", ({ apply, message }) => {
    expect(() =>
      GatewayUsageAdmission.reserve({
        ...baseInput,
        ...apply()
      })
    ).toThrowError(new DomainValidationError(message));
  });

  it("rejects invalid actual token counts during settle", () => {
    const reserved = GatewayUsageAdmission.reserve(baseInput);

    expect(() => reserved.settle(-1, new Date("2026-03-20T12:01:00.000Z"))).toThrowError(
      new DomainValidationError(
        "Actual token counts must be non-negative safe integers."
      )
    );
  });

  it("rejects settling a released admission", () => {
    const released = GatewayUsageAdmission.reserve(baseInput).release(
      new Date("2026-03-20T12:01:00.000Z"),
      "request_failed"
    );

    expect(() =>
      released.settle(100, new Date("2026-03-20T12:02:00.000Z"))
    ).toThrowError(
      new DomainValidationError(
        "Released gateway usage admissions cannot be settled."
      )
    );
  });

  it("rejects releasing a settled admission", () => {
    const settled = GatewayUsageAdmission.reserve(baseInput).settle(
      180,
      new Date("2026-03-20T12:01:00.000Z")
    );

    expect(() =>
      settled.release(new Date("2026-03-20T12:02:00.000Z"), "request_failed")
    ).toThrowError(
      new DomainValidationError(
        "Settled gateway usage admissions cannot be released."
      )
    );
  });

  it.each([
    { label: "too short", releaseReason: "ok" },
    { label: "too long", releaseReason: "x".repeat(121) }
  ])("rejects $label release reasons", ({ releaseReason }) => {
    const reserved = GatewayUsageAdmission.reserve(baseInput);

    expect(() =>
      reserved.release(new Date("2026-03-20T12:01:00.000Z"), releaseReason)
    ).toThrowError(
      new DomainValidationError(
        "Gateway admission release reasons must be between 3 and 120 characters."
      )
    );
  });
});
