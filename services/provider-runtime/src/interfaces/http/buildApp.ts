import Fastify, { type FastifyInstance } from "fastify";
import type { ServeMockChatCompletionUseCase } from "../../application/runtime/ServeMockChatCompletionUseCase.js";
import type { ServeMockEmbeddingUseCase } from "../../application/runtime/ServeMockEmbeddingUseCase.js";
import { registerProviderRuntimeRoutes } from "./providerRuntimeRoutes.js";

export function buildApp(input: {
  serveMockChatCompletionUseCase: Pick<
    ServeMockChatCompletionUseCase,
    "execute"
  >;
  serveMockEmbeddingUseCase?: Pick<ServeMockEmbeddingUseCase, "execute">;
}): FastifyInstance {
  const app = Fastify();

  registerProviderRuntimeRoutes(
    app,
    input.serveMockChatCompletionUseCase,
    input.serveMockEmbeddingUseCase,
  );

  return app;
}
