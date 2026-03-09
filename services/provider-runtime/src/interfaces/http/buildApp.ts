import Fastify, { type FastifyInstance } from "fastify";
import type { ServeMockChatCompletionUseCase } from "../../application/runtime/ServeMockChatCompletionUseCase.js";
import { registerProviderRuntimeRoutes } from "./providerRuntimeRoutes.js";

export function buildApp(input: {
  serveMockChatCompletionUseCase: Pick<
    ServeMockChatCompletionUseCase,
    "execute"
  >;
}): FastifyInstance {
  const app = Fastify();

  registerProviderRuntimeRoutes(app, input.serveMockChatCompletionUseCase);

  return app;
}
