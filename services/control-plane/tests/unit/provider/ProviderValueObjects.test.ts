import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { ProviderEndpointUrl } from "../../../src/domain/provider/ProviderEndpointUrl.js";
import { parseProviderHealthState } from "../../../src/domain/provider/ProviderHealthState.js";
import { ProviderHostname } from "../../../src/domain/provider/ProviderHostname.js";
import { ProviderMachineId } from "../../../src/domain/provider/ProviderMachineId.js";
import { ProviderNodeLabel } from "../../../src/domain/provider/ProviderNodeLabel.js";
import { ProviderPriceFloorUsdPerHour } from "../../../src/domain/provider/ProviderPriceFloorUsdPerHour.js";
import { ProviderRegion } from "../../../src/domain/provider/ProviderRegion.js";
import { parseProviderRuntime } from "../../../src/domain/provider/ProviderRuntime.js";
import {
  parseProviderTrustTier,
  providerTrustTierMeetsMinimum
} from "../../../src/domain/provider/ProviderTrustTier.js";

describe("provider value objects", () => {
  it("parses supported provider enums", () => {
    expect(parseProviderRuntime("kubernetes")).toBe("kubernetes");
    expect(parseProviderTrustTier("t2_attested")).toBe("t2_attested");
    expect(parseProviderHealthState("degraded")).toBe("degraded");
  });

  it("rejects unsupported provider enums", () => {
    expect(() => parseProviderRuntime("windows")).toThrow(
      DomainValidationError
    );
    expect(() => parseProviderTrustTier("t3_private")).toThrow(
      DomainValidationError
    );
    expect(() => parseProviderHealthState("offline")).toThrow(
      DomainValidationError
    );
  });

  it("normalizes valid provider identifiers", () => {
    expect(ProviderHostname.create(" node-01.internal ").value).toBe(
      "node-01.internal"
    );
    expect(ProviderNodeLabel.create(" Primary Vetted Node ").value).toBe(
      "Primary Vetted Node"
    );
    expect(ProviderRegion.create(" eu-central-1 ").value).toBe("eu-central-1");
    expect(ProviderMachineId.create(" node-machine_01:gpu ").value).toBe(
      "node-machine_01:gpu"
    );
    expect(
      ProviderEndpointUrl.create("https://node-01.example.com/v1/chat ").value
    ).toBe("https://node-01.example.com/v1/chat");
    expect(
      ProviderEndpointUrl.create(
        "http://127.0.0.1:3200/v1/chat/completions?organizationId=abc"
      ).value
    ).toBe("http://127.0.0.1:3200/v1/chat/completions?organizationId=abc");
    expect(ProviderPriceFloorUsdPerHour.create(5.25).value).toBe(5.25);
  });

  it("rejects invalid provider identifiers", () => {
    expect(() => ProviderHostname.create(" ")).toThrow(DomainValidationError);
    expect(() => ProviderNodeLabel.create("no")).toThrow(DomainValidationError);
    expect(() => ProviderRegion.create(" ")).toThrow(DomainValidationError);
    expect(() => ProviderMachineId.create("bad id")).toThrow(
      DomainValidationError
    );
    expect(() =>
      ProviderEndpointUrl.create("http://node-01.example.com")
    ).toThrow(DomainValidationError);
    expect(() => ProviderPriceFloorUsdPerHour.create(0)).toThrow(
      DomainValidationError
    );
  });

  it("rejects malformed provider endpoint URLs and embedded credentials", () => {
    expect(() => ProviderEndpointUrl.create("not-a-url")).toThrow(
      DomainValidationError
    );
    expect(() =>
      ProviderEndpointUrl.create(
        "https://user:secret@node-01.example.com/v1/chat/completions"
      )
    ).toThrow(DomainValidationError);
  });

  it("rejects non-finite provider price floors", () => {
    expect(() =>
      ProviderPriceFloorUsdPerHour.create(Number.POSITIVE_INFINITY)
    ).toThrow(DomainValidationError);
  });

  it("compares provider trust tiers by minimum threshold", () => {
    expect(providerTrustTierMeetsMinimum("t2_attested", "t1_vetted")).toBe(
      true
    );
    expect(providerTrustTierMeetsMinimum("t1_vetted", "t1_vetted")).toBe(true);
    expect(providerTrustTierMeetsMinimum("t0_community", "t1_vetted")).toBe(
      false
    );
  });
});
