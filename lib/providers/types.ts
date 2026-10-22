// Provider-facing contract (blueprint section 8). Each adapter translates its
// provider's approved API into these shapes; nothing provider-specific leaks
// past the sync layer.

export interface ProviderHolding {
  folioNumber: string; // raw value from the provider; tokenised before storage
  schemeCode: string;
  schemeName: string;
  assetClass: string;
  units: number;
  nav: number;
  navDate: string;
  marketValue: number | null; // provider-reported value when available
}

export interface ProviderPortfolio {
  investorRef: string;
  asOf: string;
  holdings: ProviderHolding[];
}

export interface ProviderTransaction {
  txnRef: string;
  folioNumber: string;
  schemeCode: string;
  schemeName: string;
  txnType: string;
  amount: number;
  units: number;
  nav: number;
  status: string;
  txnDate: string;
  lastUpdated: string;
}

export interface ProviderTransactionPage {
  items: ProviderTransaction[];
  nextCursor: string | null;
}

export interface ProviderSip {
  mandateRef: string;
  schemeCode: string;
  schemeName: string;
  amount: number;
  frequency: string;
  nextDueDate: string | null;
  status: string;
  lastInstallmentStatus: string | null;
}

export interface MutualFundProvider {
  readonly id: string;
  readonly label: string;
  getPortfolio(providerAccountRef: string): Promise<ProviderPortfolio>;
  getTransactions(providerAccountRef: string, from: string, to: string, cursor?: string): Promise<ProviderTransactionPage>;
  getSipDetails?(providerAccountRef: string): Promise<ProviderSip[]>;
}
