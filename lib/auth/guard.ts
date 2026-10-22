import { redirect } from "next/navigation";
import { getAuth, type AuthContext } from "./session";
import type { Role } from "../db/types";

// For server components. Layouts aren't re-run on client-side navigation,
// so every page checks the session itself.
export async function requireUser(role: Role): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.user.role !== role) redirect(auth.user.role === "admin" ? "/admin" : "/portal");
  return auth;
}
