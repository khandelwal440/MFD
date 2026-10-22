import Link from "next/link";
import { AccessError } from "@/lib/services/portfolio";

// Rendered when the investor has no verified account link or no consent.
export default function AccessNotice({ error }: { error: AccessError }) {
  return (
    <div className="card empty">
      <h2>{error.code === "CONSENT_REQUIRED" ? "Consent needed" : "No linked investments yet"}</h2>
      <p>
        {error.code === "CONSENT_REQUIRED"
          ? "We need your consent before showing portfolio data in the portal."
          : "Your login isn't linked to any verified investor records yet."}
      </p>
      <Link className="btn btn-primary" href="/portal/support">
        Contact support
      </Link>
    </div>
  );
}

export async function withAccess<T>(fn: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: AccessError }> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    if (e instanceof AccessError) return { data: null, error: e };
    throw e;
  }
}
