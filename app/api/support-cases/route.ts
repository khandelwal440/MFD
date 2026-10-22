import { error, json, withAuth } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createSupportCase, listSupportCases, validateSupportInput } from "@/lib/services/support";

export const GET = withAuth(async ({ user }) => json({ cases: listSupportCases(user.id) }));

export const POST = withAuth(
  async ({ user }, req) => {
    if (!rateLimit(`support:${user.id}`, 10, 60 * 60 * 1000)) return error("RATE_LIMITED", "Too many requests. Please try later.", 429);
    const body = (await req.json().catch(() => ({}))) as { category?: unknown; description?: unknown; source?: unknown };
    const v = validateSupportInput(body);
    if (!v.ok) return error("INVALID", v.message, 400);
    const c = createSupportCase(user.id, v.category, v.description, body.source === "assistant" ? "assistant" : "portal");
    return json({ reference: c.reference, status: c.status }, 201);
  },
  { mutating: true },
);
