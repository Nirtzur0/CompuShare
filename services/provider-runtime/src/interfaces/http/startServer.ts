import "dotenv/config";
import { loadProviderRuntimeSettings } from "../../config/ProviderRuntimeSettings.js";
import { FetchProviderRuntimeAdmissionClient } from "../../infrastructure/controlPlane/FetchProviderRuntimeAdmissionClient.js";
import { FetchPrivateConnectorControlPlaneClient } from "../../infrastructure/controlPlane/FetchPrivateConnectorControlPlaneClient.js";
import { ServeMockChatCompletionUseCase } from "../../application/runtime/ServeMockChatCompletionUseCase.js";
import { ServeMockEmbeddingUseCase } from "../../application/runtime/ServeMockEmbeddingUseCase.js";
import { ServePrivateConnectorChatCompletionUseCase } from "../../application/runtime/ServePrivateConnectorChatCompletionUseCase.js";
import { buildApp } from "./buildApp.js";

async function startServer(): Promise<void> {
  const settings = loadProviderRuntimeSettings(process.env);
  const providerRuntimeAdmissionClient =
    settings.providerRuntimeApiKey === undefined
      ? undefined
      : new FetchProviderRuntimeAdmissionClient(
          settings.controlPlaneBaseUrl,
          settings.providerRuntimeApiKey,
        );
  const serveMockChatCompletionUseCase =
    providerRuntimeAdmissionClient === undefined
      ? undefined
      : new ServeMockChatCompletionUseCase(providerRuntimeAdmissionClient);
  const serveMockEmbeddingUseCase =
    providerRuntimeAdmissionClient === undefined
      ? undefined
      : new ServeMockEmbeddingUseCase(providerRuntimeAdmissionClient);

  const privateConnectorControlPlaneClient =
    settings.privateConnectorMode === undefined ||
    settings.privateConnectorOrganizationId === undefined ||
    settings.privateConnectorEnvironment === undefined ||
    settings.privateConnectorId === undefined ||
    settings.privateConnectorForwardBaseUrl === undefined ||
    settings.privateConnectorOrgApiKey === undefined
      ? undefined
      : new FetchPrivateConnectorControlPlaneClient(
          settings.controlPlaneBaseUrl,
          settings.privateConnectorOrgApiKey,
        );
  const servePrivateConnectorChatCompletionUseCase =
    privateConnectorControlPlaneClient === undefined ||
    settings.privateConnectorMode === undefined ||
    settings.privateConnectorForwardBaseUrl === undefined
      ? undefined
      : new ServePrivateConnectorChatCompletionUseCase(
          privateConnectorControlPlaneClient,
          settings.privateConnectorMode,
          settings.privateConnectorForwardBaseUrl,
          settings.privateConnectorUpstreamApiKey ?? null,
        );

  if (
    serveMockChatCompletionUseCase === undefined &&
    servePrivateConnectorChatCompletionUseCase === undefined
  ) {
    throw new Error(
      "Provider runtime requires either PROVIDER_RUNTIME_API_KEY or the PRIVATE_CONNECTOR_* configuration set.",
    );
  }

  const app = buildApp({
    ...(serveMockChatCompletionUseCase === undefined
      ? {}
      : { serveMockChatCompletionUseCase }),
    ...(serveMockEmbeddingUseCase === undefined
      ? {}
      : { serveMockEmbeddingUseCase }),
    ...(servePrivateConnectorChatCompletionUseCase === undefined
      ? {}
      : { servePrivateConnectorChatCompletionUseCase }),
  });

  await app.listen({
    host: settings.host,
    port: settings.port,
  });

  if (
    privateConnectorControlPlaneClient !== undefined &&
    settings.privateConnectorOrganizationId !== undefined &&
    settings.privateConnectorEnvironment !== undefined &&
    settings.privateConnectorId !== undefined
  ) {
    const organizationId = settings.privateConnectorOrganizationId;
    const environment = settings.privateConnectorEnvironment;
    const connectorId = settings.privateConnectorId;

    const postCheckIn = async (): Promise<void> => {
      await privateConnectorControlPlaneClient.checkIn({
        organizationId,
        environment,
        connectorId,
        runtimeVersion: settings.privateConnectorRuntimeVersion,
      });
    };

    await postCheckIn();
    setInterval(() => {
      void postCheckIn();
    }, settings.privateConnectorHeartbeatIntervalMs).unref();
  }
}

void startServer();
