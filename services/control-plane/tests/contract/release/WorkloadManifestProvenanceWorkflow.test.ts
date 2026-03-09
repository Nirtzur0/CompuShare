import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("workload manifest provenance workflow", () => {
  it("checks in workflow wiring that emits and uploads the signed provenance artifact", async () => {
    const workflowPath = resolve(
      process.cwd(),
      "../../.github/workflows/workload-manifest-provenance.yml"
    );
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("name: workload-manifest-provenance");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("uses: actions/checkout@v4");
    expect(workflow).toContain("uses: pnpm/action-setup@v4");
    expect(workflow).toContain("uses: actions/setup-node@v4");
    expect(workflow).toContain("node-version: 20");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("pnpm workload-manifest:provenance");
    expect(workflow).toContain("uses: actions/upload-artifact@v4");
    expect(workflow).toContain(
      "path: services/control-plane/artifacts/workload-manifest-provenance.json"
    );
    expect(workflow).toContain(
      "WORKLOAD_MANIFEST_SIGNING_KEY: ${{ secrets.WORKLOAD_MANIFEST_SIGNING_KEY }}"
    );
    expect(workflow).toContain(
      "WORKLOAD_MANIFEST_SIGNING_KEY_ID: ${{ secrets.WORKLOAD_MANIFEST_SIGNING_KEY_ID }}"
    );
    expect(workflow).toContain(
      "WORKLOAD_MANIFEST_SIGNING_IDENTITY: github-actions[bot]"
    );
  });
});
