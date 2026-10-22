import { ProviderError } from "./errors";
import { mockProvider } from "./mock";
import type { MutualFundProvider } from "./types";
import type { ProviderId } from "../db/types";

// Placeholder adapters for the real providers. Each stays disabled until the
// provider has approved API access, issued credentials and signed off UAT.
// Implement them against the official documentation only, never by scraping
// distributor portals or reusing human logins.
function notApproved(id: ProviderId, label: string): MutualFundProvider {
  const fail = async (): Promise<never> => {
    throw new ProviderError("NOT_APPROVED", `${label} integration is not yet approved/configured`);
  };
  return { id, label, getPortfolio: fail, getTransactions: fail, getSipDetails: fail };
}

const providers: Record<ProviderId, MutualFundProvider> = {
  MOCK: mockProvider,
  KFINTECH: notApproved("KFINTECH", "KFintech / IRIS"),
  CAMS: notApproved("CAMS", "CAMS / MF Central"),
  NSE: notApproved("NSE", "NSE MF Invest"),
  BSE: notApproved("BSE", "BSE StAR MF"),
};

export function getProvider(id: ProviderId): MutualFundProvider {
  return providers[id];
}

export function listProviders() {
  return Object.values(providers).map((p) => ({ id: p.id as ProviderId, label: p.label, enabled: p.id === "MOCK" }));
}
