import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "../../../app/page.js";

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("links to the public operations index", () => {
    render(<HomePage />);

    const operationsLink = screen.getByRole("link", {
      name: /operations index/i,
    });
    expect(operationsLink.getAttribute("href")).toBe("/operations");
  });
});
