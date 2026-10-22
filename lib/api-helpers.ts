import { AccessError } from "./services/portfolio";
import { error, json } from "./http";

// Wraps a portfolio service call, mapping access errors to a 403.
export async function portfolioCall(fn: () => Promise<unknown>) {
  try {
    return json(await fn());
  } catch (e) {
    if (e instanceof AccessError) {
      return error(
        e.code,
        e.code === "CONSENT_REQUIRED" ? "Consent is required to show portfolio data." : "No verified investor account is linked to this login.",
        403,
      );
    }
    throw e;
  }
}
