import { randomInt } from "node:crypto";
import { db, newId } from "../db/store";
import type { SupportCase, SupportCategory } from "../db/types";
import { audit } from "../audit";

export const SUPPORT_CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: "portfolio_data", label: "Portfolio value or holdings look wrong" },
  { id: "transaction_status", label: "Transaction status" },
  { id: "sip_mandate", label: "SIP or mandate" },
  { id: "statement_request", label: "Statement request" },
  { id: "account_access", label: "Login or account access" },
  { id: "other", label: "Something else" },
];

const PAN = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi;
const LONG_DIGITS = /\b\d{9,18}\b/g; // bank/folio/card-like numbers
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Strip identifiers people often paste into free text. Support staff can
// look these up through proper channels; they don't belong in a ticket body.
export function redactSensitive(text: string): string {
  return text.replace(PAN, "[PAN removed]").replace(LONG_DIGITS, "[number removed]").replace(EMAIL, "[email removed]");
}

export function validateSupportInput(input: { category?: unknown; description?: unknown }):
  | { ok: true; category: SupportCategory; description: string }
  | { ok: false; message: string } {
  const category = SUPPORT_CATEGORIES.find((c) => c.id === input.category)?.id;
  if (!category) return { ok: false, message: "Choose a valid category." };
  if (typeof input.description !== "string") return { ok: false, message: "Describe the issue." };
  const description = redactSensitive(input.description.trim()).slice(0, 1000);
  if (description.length < 10) return { ok: false, message: "Please add a little more detail (10+ characters)." };
  return { ok: true, category, description };
}

export function createSupportCase(userId: string, category: SupportCategory, description: string, source: SupportCase["source"]): SupportCase {
  const c: SupportCase = {
    id: newId(),
    reference: `SR-${new Date().getFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`,
    userId,
    category,
    description,
    status: "open",
    assignedTo: null,
    createdAt: new Date().toISOString(),
    source,
  };
  db().supportCases.push(c);
  audit({ actorType: "user", actorId: userId, action: "support_case.create", targetType: "support_case", targetId: c.id, outcome: "success" });
  return c;
}

export function listSupportCases(userId: string) {
  return db()
    .supportCases.filter((c) => c.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(({ reference, category, description, status, createdAt, source }) => ({ reference, category, description, status, createdAt, source }));
}
