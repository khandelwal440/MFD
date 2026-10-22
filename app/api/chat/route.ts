import { error, json, withAuth } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { chat, resetConversation } from "@/lib/ai/orchestrator";

export const POST = withAuth(
  async ({ user, sessionId }, req) => {
    if (user.role !== "investor") return error("FORBIDDEN", "The assistant is for investor accounts.", 403);
    if (!rateLimit(`chat:${user.id}`, 20, 60 * 1000)) return error("RATE_LIMITED", "You're sending messages quickly. Please wait a moment.", 429);
    const body = (await req.json().catch(() => ({}))) as { message?: unknown };
    if (typeof body.message !== "string" || !body.message.trim()) return error("INVALID", "Type a message.", 400);
    if (body.message.length > 2000) return error("INVALID", "Please keep messages under 2,000 characters.", 400);
    return json(await chat(user.id, sessionId, body.message.trim()));
  },
  { mutating: true },
);

export const DELETE = withAuth(
  async ({ sessionId }) => {
    resetConversation(sessionId);
    return json({ ok: true });
  },
  { mutating: true },
);
