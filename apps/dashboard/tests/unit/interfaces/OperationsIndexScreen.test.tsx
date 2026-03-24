import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationsIndexScreen } from "../../../src/interfaces/react/OperationsIndexScreen.js";

describe("OperationsIndexScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the operations index with all canonical runbooks and release gates", () => {
    render(<OperationsIndexScreen />);

    expect(
      screen.getByRole("heading", {
        name: /compushare launch operations runbooks/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Incident response")).toBeTruthy();
    expect(screen.getByText("On-call rotation")).toBeTruthy();
    expect(screen.getByText("Support escalation")).toBeTruthy();
    expect(
      screen.getAllByText(/incident response runbook complete/i),
    ).toHaveLength(2);
    expect(screen.getByText(/docs\/runbooks\/incident-response\.md/i)).toBeTruthy();
  });
});
