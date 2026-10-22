export type ProviderErrorCode =
  | "AUTH_EXPIRED"
  | "RATE_LIMITED"
  | "TEMP_UNAVAILABLE"
  | "DATA_NOT_FOUND"
  | "NOT_APPROVED"
  | "UNKNOWN";

export class ProviderError extends Error {
  constructor(public code: ProviderErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ProviderError";
  }
  get transient() {
    return this.code === "RATE_LIMITED" || this.code === "TEMP_UNAVAILABLE";
  }
}

export function toProviderError(e: unknown): ProviderError {
  return e instanceof ProviderError ? e : new ProviderError("UNKNOWN", e instanceof Error ? e.message : String(e));
}
