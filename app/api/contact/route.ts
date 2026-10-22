import { db, newId } from "@/lib/db/store";
import type { ContactLead } from "@/lib/db/types";
import { error, json, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { redactSensitive } from "@/lib/services/support";

const TOPICS: ContactLead["topic"][] = ["new_investor", "portal_access", "servicing", "grievance", "other"];

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("FORBIDDEN", "Cross-origin request rejected", 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) return error("RATE_LIMITED", "Too many messages. Please try later.", 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 100) : "";
  const contact = typeof b.contact === "string" ? b.contact.trim().slice(0, 120) : "";
  const message = typeof b.message === "string" ? redactSensitive(b.message.trim()).slice(0, 1000) : "";
  const topic = TOPICS.find((t) => t === b.topic);
  if (name.length < 2 || contact.length < 5 || !topic) return error("INVALID", "Please fill in your name, contact and topic.", 400);
  if (b.consent !== true) return error("INVALID", "Please agree to be contacted.", 400);
  const now = new Date().toISOString();
  db().leads.push({ id: newId(), name, contact, topic, message, consentAt: now, createdAt: now });
  return json({ ok: true }, 201);
}
