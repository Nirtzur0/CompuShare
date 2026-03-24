import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GetSubprocessorRegistryUseCase } from "../../application/compliance/GetSubprocessorRegistryUseCase.js";
import type { GenerateDpaExportUseCase } from "../../application/compliance/GenerateDpaExportUseCase.js";
import {
  DpaExportAuthorizationError,
  DpaExportCapabilityRequiredError,
  DpaExportOrganizationNotFoundError
} from "../../application/compliance/GenerateDpaExportUseCase.js";

const complianceParamsSchema = z.object({
  organizationId: z.uuid()
});

const dpaExportQuerySchema = z.object({
  actorUserId: z.uuid(),
  environment: z.enum(["development", "staging", "production"])
});

export function registerComplianceRoutes(
  app: FastifyInstance,
  getSubprocessorRegistryUseCase: Pick<GetSubprocessorRegistryUseCase, "execute">,
  generateDpaExportUseCase: Pick<GenerateDpaExportUseCase, "execute">
): void {
  app.get("/v1/compliance/subprocessors", async (_request, reply) => {
    const response = getSubprocessorRegistryUseCase.execute();

    return await reply.status(200).send(response);
  });

  app.get(
    "/v1/organizations/:organizationId/compliance/dpa-export",
    async (request, reply) => {
      const parsedParams = complianceParamsSchema.safeParse(request.params);
      const parsedQuery = dpaExportQuerySchema.safeParse(request.query);

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
        });
      }

      try {
        const response = await generateDpaExportUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId,
          environment: parsedQuery.data.environment
        });

        reply.header("content-type", response.contentType);
        reply.header(
          "content-disposition",
          `attachment; filename="${response.fileName}"`
        );
        return await reply.status(200).send(response.markdown);
      } catch (error) {
        if (error instanceof DpaExportOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "DPA_EXPORT_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof DpaExportCapabilityRequiredError) {
          return reply.status(403).send({
            error: "DPA_EXPORT_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof DpaExportAuthorizationError) {
          return reply.status(403).send({
            error: "DPA_EXPORT_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
