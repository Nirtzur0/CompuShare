import type {
  PrivateConnectorExecutionGrant,
  SignedPrivateConnectorExecutionGrant
} from "../../../domain/privateConnector/PrivateConnectorExecutionGrant.js";

export interface PrivateConnectorExecutionGrantSignatureService {
  sign(
    grant: PrivateConnectorExecutionGrant
  ): SignedPrivateConnectorExecutionGrant;
  verify(grant: SignedPrivateConnectorExecutionGrant): boolean;
}
