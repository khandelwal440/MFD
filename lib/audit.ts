import { db, newId } from "./db/store";
import type { AuditEvent } from "./db/types";

// Audit events record who did what and the outcome. Never put tokens,
// passwords, PAN, bank data or message content in here.
export function audit(e: Omit<AuditEvent, "id" | "timestamp" | "requestId"> & { requestId?: string }) {
  const event: AuditEvent = {
    id: newId(),
    timestamp: new Date().toISOString(),
    requestId: e.requestId ?? newId(),
    ...e,
  };
  const store = db();
  store.auditEvents.push(event);
  if (store.auditEvents.length > 5000) store.auditEvents.splice(0, 1000);
  return event;
}
