import { completeLogin } from "@/lib/auth/session";
import { error, json, sameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("FORBIDDEN", "Cross-origin request rejected", 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`otp:${ip}`, 20, 10 * 60 * 1000)) return error("RATE_LIMITED", "Too many attempts. Try again in a few minutes.", 429);
  const body = (await req.json().catch(() => ({}))) as { pendingId?: unknown; otp?: unknown };
  if (typeof body.pendingId !== "string" || typeof body.otp !== "string" || !/^\d{6}$/.test(body.otp.trim())) {
    return error("INVALID", "Enter the 6-digit code.", 400);
  }
  const user = await completeLogin(body.pendingId, body.otp);
  if (!user) return error("INVALID_OTP", "That code is incorrect or has expired.", 401);
  return json({ role: user.role, redirect: user.role === "admin" ? "/admin" : "/portal" });
}
