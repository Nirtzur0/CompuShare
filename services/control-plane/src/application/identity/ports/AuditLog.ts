export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | AuditMetadataValue[];

export interface AuditEvent {
  eventName: string;
  occurredAt: string;
  actorUserId: string;
  organizationId: string;
  metadata: Record<string, AuditMetadataValue>;
}

export interface AuditLog {
  record(event: AuditEvent): Promise<void>;
}
