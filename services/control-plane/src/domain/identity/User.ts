import { DomainValidationError } from "./DomainValidationError.js";
import { EmailAddress } from "./EmailAddress.js";
import { UserId } from "./UserId.js";

export interface UserSnapshot {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: EmailAddress,
    public readonly displayName: string,
    public readonly createdAt: Date
  ) {}

  public static createNew(input: {
    email: EmailAddress;
    displayName: string;
    createdAt: Date;
  }): User {
    return new User(
      UserId.create(),
      input.email,
      User.normalizeDisplayName(input.displayName),
      input.createdAt
    );
  }

  public static rehydrate(input: {
    id: string;
    email: string;
    displayName: string;
    createdAt: Date;
  }): User {
    return new User(
      UserId.create(input.id),
      EmailAddress.create(input.email),
      User.normalizeDisplayName(input.displayName),
      input.createdAt
    );
  }

  public toSnapshot(): UserSnapshot {
    return {
      id: this.id.value,
      email: this.email.value,
      displayName: this.displayName,
      createdAt: this.createdAt.toISOString()
    };
  }

  private static normalizeDisplayName(rawValue: string): string {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 2 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "Display name must be between 2 and 120 characters."
      );
    }

    return normalizedValue;
  }
}
