import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, newId } from "../db/store";
import type { User } from "../db/types";
import { OTP_TTL_MS, SESSION_COOKIE, SESSION_TTL_MS, sessionSecret } from "../config";
import { sha256, verifyPassword } from "./password";
import { audit } from "../audit";

function sign(value: string): string {
  const mac = createHmac("sha256", sessionSecret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function unsign(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const value = token.slice(0, i);
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return value;
}

// Step 1: password check. On success returns a pending-login id; the OTP is
// delivered out of band (SMS/email in production; console + dev response here).
export function startLogin(loginSubject: string, password: string): { pendingId: string; devOtp?: string } | null {
  const store = db();
  const user = store.users.find((u) => u.loginSubject.toLowerCase() === loginSubject.trim().toLowerCase());
  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
    audit({ actorType: "anonymous", actorId: null, action: "login.password", targetType: "user", targetId: null, outcome: "denied" });
    return null;
  }
  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const pending = { id: newId(), userId: user.id, otpHash: sha256(otp), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };
  store.pendingLogins = store.pendingLogins.filter((p) => p.userId !== user.id && p.expiresAt > Date.now());
  store.pendingLogins.push(pending);
  audit({ actorType: "user", actorId: user.id, action: "login.password", targetType: "user", targetId: user.id, outcome: "success" });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] OTP for ${user.loginSubject}: ${otp}`);
    return { pendingId: pending.id, devOtp: otp };
  }
  return { pendingId: pending.id };
}

// Step 2: OTP check. Creates the session and sets the cookie.
export async function completeLogin(pendingId: string, otp: string): Promise<User | null> {
  const store = db();
  const pending = store.pendingLogins.find((p) => p.id === pendingId);
  if (!pending || pending.expiresAt < Date.now() || pending.attempts >= 5) return null;
  pending.attempts++;
  if (sha256(otp.trim()) !== pending.otpHash) {
    audit({ actorType: "user", actorId: pending.userId, action: "login.otp", targetType: "user", targetId: pending.userId, outcome: "denied" });
    return null;
  }
  store.pendingLogins = store.pendingLogins.filter((p) => p.id !== pendingId);
  const user = store.users.find((u) => u.id === pending.userId)!;
  const session = { id: newId(), userId: user.id, createdAt: Date.now(), lastSeenAt: Date.now(), revokedAt: null };
  store.sessions.push(session);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sign(session.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  audit({ actorType: "user", actorId: user.id, action: "login.otp", targetType: "session", targetId: session.id, outcome: "success" });
  return user;
}

export interface AuthContext {
  user: User;
  sessionId: string;
}

// Resolves the current user from the cookie. Identity always comes from here,
// never from request bodies, query params or the AI model.
export async function getAuth(): Promise<AuthContext | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const sessionId = unsign(raw);
  if (!sessionId) return null;
  const store = db();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session || session.revokedAt || Date.now() - session.lastSeenAt > SESSION_TTL_MS) return null;
  const user = store.users.find((u) => u.id === session.userId);
  if (!user || user.status !== "active") return null;
  session.lastSeenAt = Date.now();
  return { user, sessionId };
}

export async function logout() {
  const auth = await getAuth();
  const jar = await cookies();
  if (auth) {
    const s = db().sessions.find((x) => x.id === auth.sessionId);
    if (s) s.revokedAt = Date.now();
    db().conversations.delete(auth.sessionId);
    audit({ actorType: "user", actorId: auth.user.id, action: "logout", targetType: "session", targetId: auth.sessionId, outcome: "success" });
  }
  jar.delete(SESSION_COOKIE);
}
