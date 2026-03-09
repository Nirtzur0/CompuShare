import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { ProviderGpuInventory } from "../../../src/domain/provider/ProviderGpuInventory.js";

describe("ProviderGpuInventory", () => {
  it("normalizes driver version and interconnect values", () => {
    const inventory = ProviderGpuInventory.create({
      driverVersion: " 550.54.14 ",
      items: [
        {
          model: " NVIDIA A100 ",
          vramGb: 80,
          count: 4,
          interconnect: " nvlink "
        }
      ]
    });

    expect(inventory.toSnapshot()).toEqual({
      driverVersion: "550.54.14",
      items: [
        {
          model: "NVIDIA A100",
          vramGb: 80,
          count: 4,
          interconnect: "nvlink"
        }
      ]
    });
  });

  it("supports missing interconnect values", () => {
    const inventory = ProviderGpuInventory.create({
      driverVersion: "550.54.14",
      items: [
        {
          model: "NVIDIA L40S",
          vramGb: 48,
          count: 2,
          interconnect: null
        }
      ]
    });

    expect(inventory.toSnapshot().items[0]?.interconnect).toBeNull();
  });

  it("rejects invalid inventory payloads", () => {
    expect(() =>
      ProviderGpuInventory.create({
        driverVersion: "55",
        items: [
          {
            model: "NVIDIA A100",
            vramGb: 80,
            count: 4,
            interconnect: "nvlink"
          }
        ]
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      ProviderGpuInventory.create({
        driverVersion: "550.54.14",
        items: []
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      ProviderGpuInventory.create({
        driverVersion: "550.54.14",
        items: [
          {
            model: "X",
            vramGb: 80,
            count: 4,
            interconnect: "nvlink"
          }
        ]
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      ProviderGpuInventory.create({
        driverVersion: "550.54.14",
        items: [
          {
            model: "NVIDIA A100",
            vramGb: 0,
            count: 4,
            interconnect: "nvlink"
          }
        ]
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      ProviderGpuInventory.create({
        driverVersion: "550.54.14",
        items: [
          {
            model: "NVIDIA A100",
            vramGb: 80,
            count: 0,
            interconnect: "nvlink"
          }
        ]
      })
    ).toThrow(DomainValidationError);
  });
});
