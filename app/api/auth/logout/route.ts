import { logout } from "@/lib/auth/session";
import { error, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("FORBIDDEN", "Cross-origin request rejected", 403);
  await logout();
  return json({ ok: true });
}
