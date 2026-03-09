import { describe, expect, it } from "vitest";
import { loadDashboardSettings } from "../../../src/config/DashboardSettings.js";

describe("loadDashboardSettings", () => {
  it("loads the control-plane base URL", () => {
    expect(
      loadDashboardSettings({
        CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3000",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({
      controlPlaneBaseUrl: "http://127.0.0.1:3000",
    });
  });

  it("requires the control-plane base URL", () => {
    expect(() => loadDashboardSettings({} as NodeJS.ProcessEnv)).toThrow(
      "CONTROL_PLANE_BASE_URL is required.",
    );
  });
});
