import { createHmac } from "node:crypto";
import type { PrivateConnectorExecutionGrantSignatureService } from "../../application/privateConnector/ports/PrivateConnectorExecutionGrantSignatureService.js";
import type {
  PrivateConnectorExecutionGrant,
  SignedPrivateConnectorExecutionGrant
} from "../../domain/privateConnector/PrivateConnectorExecutionGrant.js";
import { SignedPrivateConnectorExecutionGrant as SignedPrivateConnectorExecutionGrantEntity } from "../../domain/privateConnector/PrivateConnectorExecutionGrant.js";

export class HmacPrivateConnectorExecutionGrantSignatureService
  implements PrivateConnectorExecutionGrantSignatureService
{
  public constructor(
    private readonly secret: string,
    private readonly keyId: string
  ) {}

  public sign(
    grant: PrivateConnectorExecutionGrant
  ): SignedPrivateConnectorExecutionGrant {
    return SignedPrivateConnectorExecutionGrantEntity.create({
      grant,
      signature: this.computeSignature(grant),
      signatureKeyId: this.keyId
    });
  }

  public verify(grant: SignedPrivateConnectorExecutionGrant): boolean {
    return (
      grant.signatureKeyId === this.keyId &&
      grant.signature === this.computeSignature(grant.grant)
    );
  }

  private computeSignature(grant: PrivateConnectorExecutionGrant): string {
    return createHmac("sha256", this.secret)
      .update(grant.toCanonicalPayload(), "utf8")
      .digest("hex");
  }
}
