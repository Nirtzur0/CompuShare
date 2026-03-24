import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  DpaExportAuthorizationError,
  DpaExportCapabilityRequiredError,
  DpaExportOrganizationNotFoundError,
} from "../../../src/application/compliance/GenerateDpaExportUseCase.js";
import { registerComplianceRoutes } from "../../../src/interfaces/http/complianceRoutes.js";

describe("compliance routes", () => {
  it("returns the public subprocessor registry", async () => {
    const app = Fastify();
    registerComplianceRoutes(
      app,
      {
        execute: () => ({
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: null,
            platformSubprocessors: [],
            providerSubprocessors: [],
            providerAppendixStatus: "not_applicable",
          },
        }),
      },
      {
        execute: () =>
          Promise.reject(new Error("unused compliance export path")),
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/compliance/subprocessors",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      registry: {
        legalEntityName: "CompuShare, Inc.",
        providerAppendixStatus: "not_applicable",
      },
    });
  });

  it("returns markdown DPA exports", async () => {
    const app = Fastify();
    registerComplianceRoutes(
      app,
      {
        execute: () => ({
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: null,
            platformSubprocessors: [],
            providerSubprocessors: [],
            providerAppendixStatus: "not_applicable",
          },
        }),
      },
      {
        execute: () =>
          Promise.resolve({
            fileName: "compushare-dpa.md",
            contentType: "text/markdown; charset=utf-8" as const,
            markdown: "# Export",
          }),
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/compliance/dpa-export?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f&environment=development",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toContain("# Export");
  });

  it("returns 400 for invalid export params and query", async () => {
    const app = Fastify();
    registerComplianceRoutes(
      app,
      {
        execute: () => ({
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: null,
            platformSubprocessors: [],
            providerSubprocessors: [],
            providerAppendixStatus: "not_applicable",
          },
        }),
      },
      {
        execute: () =>
          Promise.reject(new Error("unused compliance export path")),
      },
    );

    const invalidParamsResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/compliance/dpa-export?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f&environment=development",
    });
    const invalidQueryResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/compliance/dpa-export?actorUserId=not-a-uuid&environment=qa",
    });

    expect(invalidParamsResponse.statusCode).toBe(400);
    expect(invalidParamsResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(invalidQueryResponse.statusCode).toBe(400);
    expect(invalidQueryResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("maps export authorization errors", async () => {
    const app = Fastify();
    registerComplianceRoutes(
      app,
      {
        execute: () => ({
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: null,
            platformSubprocessors: [],
            providerSubprocessors: [],
            providerAppendixStatus: "not_applicable",
          },
        }),
      },
      {
        execute: () =>
          Promise.reject(new DpaExportCapabilityRequiredError()),
      },
    );

    const capabilityResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/compliance/dpa-export?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f&environment=development",
    });

    expect(capabilityResponse.statusCode).toBe(403);

    await app.close();
    const authApp = Fastify();
    registerComplianceRoutes(
      authApp,
      {
        execute: () => ({
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: null,
            platformSubprocessors: [],
            providerSubprocessors: [],
            providerAppendixStatus: "not_applicable",
          },
        }),
      },
      {
        execute: () =>
          Promise.reject(new DpaExportAuthorizationError()),
      },
    );

    const authResponse = await authApp.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/compliance/dpa-export?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f&environment=development",
    });

    expect(authResponse.statusCode).toBe(403);

    await authApp.close();
    const notFoundApp = Fastify();
    registerComplianceRoutes(
      notFoundApp,
      {
        execute: () => ({
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: null,
            platformSubprocessors: [],
            providerSubprocessors: [],
            providerAppendixStatus: "not_applicable",
          },
        }),
      },
      {
        execute: () =>
          Promise.reject(
            new DpaExportOrganizationNotFoundError(
              "87057cb0-e0ca-4095-9f25-dd8103408b18",
            ),
          ),
      },
    );

    const notFoundResponse = await notFoundApp.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/compliance/dpa-export?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f&environment=development",
    });

    expect(notFoundResponse.statusCode).toBe(404);

    await notFoundApp.close();
  });
});
