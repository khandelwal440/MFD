import { startLogin } from "@/lib/auth/session";
import { error, json, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("FORBIDDEN", "Cross-origin request rejected", 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}`, 10, 10 * 60 * 1000)) return error("RATE_LIMITED", "Too many attempts. Try again in a few minutes.", 429);
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 200 || body.password.length > 200) {
    return error("INVALID", "Enter your email and password.", 400);
  }
  const result = startLogin(body.email, body.password);
  // Same message for unknown user and wrong password.
  if (!result) return error("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  return json(result);
}
