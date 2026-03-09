import { createHash } from "node:crypto";
import { DomainValidationError } from "./DomainValidationError.js";

export class InvitationToken {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): InvitationToken {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 16 || normalizedValue.length > 256) {
      throw new DomainValidationError(
        "Invitation token must be between 16 and 256 characters."
      );
    }

    return new InvitationToken(normalizedValue);
  }

  public toHash(): string {
    return createHash("sha256").update(this.value).digest("hex");
  }
}
