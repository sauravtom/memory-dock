import { nanoid } from "nanoid";
import type { AuditEvent } from "./types.js";

export function audit(action: AuditEvent["action"], message: string, metadata: Record<string, unknown> = {}): AuditEvent {
  return {
    id: `audit_${nanoid(10)}`,
    action,
    message,
    metadata,
    createdAt: new Date().toISOString()
  };
}

