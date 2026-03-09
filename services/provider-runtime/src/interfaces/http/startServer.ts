import "dotenv/config";
import { loadProviderRuntimeSettings } from "../../config/ProviderRuntimeSettings.js";
import { FetchProviderRuntimeAdmissionClient } from "../../infrastructure/controlPlane/FetchProviderRuntimeAdmissionClient.js";
import { ServeMockChatCompletionUseCase } from "../../application/runtime/ServeMockChatCompletionUseCase.js";
import { buildApp } from "./buildApp.js";

async function startServer(): Promise<void> {
  const settings = loadProviderRuntimeSettings(process.env);
  const serveMockChatCompletionUseCase = new ServeMockChatCompletionUseCase(
    new FetchProviderRuntimeAdmissionClient(
      settings.controlPlaneBaseUrl,
      settings.providerRuntimeApiKey,
    ),
  );
  const app = buildApp({
    serveMockChatCompletionUseCase,
  });

  await app.listen({
    host: settings.host,
    port: settings.port,
  });
}

void startServer();
