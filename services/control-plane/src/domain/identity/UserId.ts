import { randomUUID } from "node:crypto";

export class UserId {
  private constructor(public readonly value: string) {}

  public static create(value: string = randomUUID()): UserId {
    return new UserId(value);
  }
}
