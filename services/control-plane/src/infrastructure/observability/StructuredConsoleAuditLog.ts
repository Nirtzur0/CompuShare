import type {
  AuditEvent,
  AuditLog
} from "../../application/identity/ports/AuditLog.js";

export class StructuredConsoleAuditLog implements AuditLog {
  public record(event: AuditEvent): Promise<void> {
    console.info(
      JSON.stringify({
        level: "info",
        category: "audit",
        ...event
      })
    );

    return Promise.resolve();
  }
}
