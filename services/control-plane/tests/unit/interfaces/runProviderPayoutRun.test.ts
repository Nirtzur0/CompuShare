import { describe, expect, it } from "vitest";
import {
  isDirectExecution,
  parseArgs
} from "../../../src/interfaces/cli/runProviderPayoutRun.js";

describe("runProviderPayoutRun CLI", () => {
  it("parses explicit environment, provider filter, and dry-run override", () => {
    expect(
      parseArgs([
        "--environment=production",
        "--provider-organization-id=87057cb0-e0ca-4095-9f25-dd8103408b18",
        "--dry-run=false"
      ])
    ).toEqual({
      environment: "production",
      providerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      dryRun: false
    });
  });

  it("uses conservative defaults when optional flags are omitted", () => {
    expect(parseArgs([])).toEqual({
      environment: "development",
      dryRun: true
    });
  });

  it("treats dry-run values other than false as true", () => {
    expect(parseArgs(["--dry-run=true"])).toEqual({
      environment: "development",
      dryRun: true
    });
  });

  it("detects direct execution only for the active entrypoint path", () => {
    expect(
      isDirectExecution(
        "file:///tmp/runProviderPayoutRun.ts",
        "/tmp/runProviderPayoutRun.ts"
      )
    ).toBe(true);
    expect(
      isDirectExecution(
        "file:///tmp/runProviderPayoutRun.ts",
        "/tmp/other-script.ts"
      )
    ).toBe(false);
    expect(
      isDirectExecution("file:///tmp/runProviderPayoutRun.ts", undefined)
    ).toBe(false);
  });
});
