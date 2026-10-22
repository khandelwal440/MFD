import { NextResponse } from "next/server";
import { getAuth, type AuthContext } from "./auth/session";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function error(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}

// CSRF defence for state-changing requests: cookies are SameSite=Lax and we
// also require the Origin header to match the host.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Handler = (auth: AuthContext, req: Request) => Promise<Response>;

export function withAuth(handler: Handler, opts: { role?: "admin"; mutating?: boolean } = {}) {
  return async (req: Request) => {
    if (opts.mutating && !sameOrigin(req)) return error("FORBIDDEN", "Cross-origin request rejected", 403);
    const auth = await getAuth();
    if (!auth) return error("UNAUTHENTICATED", "Please sign in", 401);
    if (opts.role && auth.user.role !== opts.role) return error("FORBIDDEN", "Not permitted", 403);
    try {
      return await handler(auth, req);
    } catch (e) {
      console.error("[api]", e instanceof Error ? e.message : e);
      return error("INTERNAL", "Something went wrong. Please try again.", 500);
    }
  };
}
