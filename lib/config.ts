export { BRAND_NAME, ARN } from "./brand";

export const SESSION_COOKIE = "mfp_session";
export const SESSION_TTL_MS = 30 * 60 * 1000; // idle expiry
export const OTP_TTL_MS = 5 * 60 * 1000;

export const STALE_AFTER_MS = Number(process.env.STALE_AFTER_HOURS || 24) * 60 * 60 * 1000;

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (16+ chars) in production");
  }
  return "dev-only-insecure-session-secret";
}

export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
