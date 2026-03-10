export interface StripeWebhookReceiptSnapshot {
  eventId: string;
  eventType: string;
  receivedAt: string;
}

export class StripeWebhookReceipt {
  private constructor(
    public readonly eventId: string,
    public readonly eventType: string,
    public readonly receivedAt: Date
  ) {}

  public static create(input: {
    eventId: string;
    eventType: string;
    receivedAt: Date;
  }): StripeWebhookReceipt {
    return new StripeWebhookReceipt(
      input.eventId,
      input.eventType,
      input.receivedAt
    );
  }

  public toSnapshot(): StripeWebhookReceiptSnapshot {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      receivedAt: this.receivedAt.toISOString()
    };
  }
}
