import { ProviderError, type ProviderErrorCode } from "./errors";
import type { MutualFundProvider, ProviderHolding, ProviderSip, ProviderTransaction } from "./types";

// Deterministic sample provider used until an official API is approved.
// It behaves like a real feed: its own field names, raw folio numbers,
// provider-reported values and configurable outages.

interface Scheme {
  code: string;
  name: string;
  assetClass: string;
  baseNav: number; // NAV on 2022-01-01
  cagr: number;
  wobble: number;
}

export const SCHEMES: Scheme[] = [
  { code: "SCH-BLUE", name: "Sample Bluechip Equity Fund - Direct Growth", assetClass: "Equity", baseNav: 42.1, cagr: 0.13, wobble: 0.05 },
  { code: "SCH-FLEXI", name: "Sample Flexi Cap Fund - Direct Growth", assetClass: "Equity", baseNav: 61.8, cagr: 0.15, wobble: 0.06 },
  { code: "SCH-MID", name: "Sample Midcap Opportunities Fund - Direct Growth", assetClass: "Equity", baseNav: 88.4, cagr: 0.18, wobble: 0.08 },
  { code: "SCH-SDF", name: "Sample Short Duration Debt Fund - Direct Growth", assetClass: "Debt", baseNav: 24.6, cagr: 0.07, wobble: 0.004 },
  { code: "SCH-LIQ", name: "Sample Liquid Fund - Direct Growth", assetClass: "Debt", baseNav: 2810.5, cagr: 0.065, wobble: 0.0005 },
  { code: "SCH-BAF", name: "Sample Balanced Advantage Fund - Direct Growth", assetClass: "Hybrid", baseNav: 31.2, cagr: 0.11, wobble: 0.03 },
  { code: "SCH-N50", name: "Sample Nifty 50 Index Fund - Direct Growth", assetClass: "Index", baseNav: 155.7, cagr: 0.12, wobble: 0.05 },
];

const EPOCH = Date.UTC(2022, 0, 1);
const DAY = 86_400_000;

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function navOn(code: string, isoDate: string): number {
  const sc = SCHEMES.find((s) => s.code === code)!;
  const days = (Date.parse(isoDate) - EPOCH) / DAY;
  const trend = sc.baseNav * Math.pow(1 + sc.cagr, days / 365);
  const wave = 1 + sc.wobble * Math.sin(days / 41 + (hash(code) % 7));
  return Math.round(trend * wave * 10000) / 10000;
}

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

interface Plan {
  folio: string;
  sips: { mandate: string; code: string; amount: number; day: number; start: string; status: "ACTIVE" | "PAUSED"; failMonths?: number[] }[];
  lumps: { code: string; type: "PURCHASE" | "REDEMPTION" | "SWITCH_IN" | "SWITCH_OUT"; amount: number; date: string }[];
}

const PLANS: Record<string, Plan> = {
  "MOCK-INV-1001": {
    folio: "1098765432",
    sips: [
      { mandate: "MDT-1001-A", code: "SCH-BLUE", amount: 5000, day: 5, start: "2023-01-05", status: "ACTIVE", failMonths: [7] },
      { mandate: "MDT-1001-B", code: "SCH-FLEXI", amount: 3000, day: 10, start: "2024-04-10", status: "ACTIVE" },
    ],
    lumps: [
      { code: "SCH-SDF", type: "PURCHASE", amount: 100000, date: "2023-06-15" },
      { code: "SCH-SDF", type: "REDEMPTION", amount: 20000, date: "2025-03-10" },
      { code: "SCH-N50", type: "PURCHASE", amount: 50000, date: "2024-11-20" },
    ],
  },
  "MOCK-INV-2002": {
    folio: "2076543210",
    sips: [
      { mandate: "MDT-2002-A", code: "SCH-BAF", amount: 10000, day: 1, start: "2022-08-01", status: "ACTIVE" },
      { mandate: "MDT-2002-B", code: "SCH-MID", amount: 2000, day: 15, start: "2025-02-15", status: "PAUSED" },
    ],
    lumps: [
      { code: "SCH-LIQ", type: "PURCHASE", amount: 200000, date: "2024-05-02" },
      { code: "SCH-LIQ", type: "SWITCH_OUT", amount: 50000, date: "2025-01-15" },
      { code: "SCH-MID", type: "SWITCH_IN", amount: 50000, date: "2025-01-15" },
    ],
  },
};

function buildTransactions(ref: string, today: string): ProviderTransaction[] {
  const plan = PLANS[ref];
  if (!plan) return [];
  const out: ProviderTransaction[] = [];
  const push = (code: string, type: string, amount: number, date: string, status: string, seq: string) => {
    const nav = navOn(code, date);
    const sc = SCHEMES.find((s) => s.code === code)!;
    out.push({
      txnRef: `${ref}-${seq}`,
      folioNumber: plan.folio,
      schemeCode: code,
      schemeName: sc.name,
      txnType: type,
      amount,
      units: status === "SUCCESS" ? round4(amount / nav) : 0,
      nav,
      status,
      txnDate: date,
      lastUpdated: `${date}T18:30:00.000Z`,
    });
  };
  for (const sip of plan.sips) {
    const start = new Date(sip.start + "T00:00:00Z");
    // a paused mandate stops after 6 instalments
    const maxCount = sip.status === "PAUSED" ? 6 : Infinity;
    for (let i = 0; i < maxCount; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, sip.day));
      const date = iso(d.getTime());
      if (date > today) break;
      const recent = Date.parse(today) - d.getTime() < 3 * DAY;
      const status = sip.failMonths?.includes(i) ? "FAILED" : recent ? "PENDING" : "SUCCESS";
      push(sip.code, "SIP", sip.amount, date, status, `${sip.mandate}-${i}`);
    }
  }
  plan.lumps.forEach((l, i) => {
    if (l.date <= today) push(l.code, l.type, l.amount, l.date, "SUCCESS", `L${i}`);
  });
  return out.sort((a, b) => (a.txnDate < b.txnDate ? 1 : -1));
}

export const mockControls = ((globalThis as unknown as { __mfpMock?: { failMode: ProviderErrorCode | "none"; failuresRemaining: number } }).__mfpMock ??= {
  failMode: "none",
  failuresRemaining: 0,
});

function maybeFail() {
  if (mockControls.failMode === "none") return;
  if (mockControls.failuresRemaining === 0) return;
  if (mockControls.failuresRemaining > 0) mockControls.failuresRemaining--;
  throw new ProviderError(mockControls.failMode, `Mock provider simulated ${mockControls.failMode}`);
}

export const mockProvider: MutualFundProvider = {
  id: "MOCK",
  label: "Sample data provider (development)",

  async getPortfolio(ref) {
    maybeFail();
    if (!PLANS[ref]) throw new ProviderError("DATA_NOT_FOUND");
    const today = iso(Date.now());
    const txns = buildTransactions(ref, today).filter((t) => t.status === "SUCCESS");
    const unitsByScheme = new Map<string, number>();
    for (const t of txns) {
      const sign = t.txnType === "REDEMPTION" || t.txnType === "SWITCH_OUT" ? -1 : 1;
      unitsByScheme.set(t.schemeCode, (unitsByScheme.get(t.schemeCode) ?? 0) + sign * t.units);
    }
    // NAVs are published end of day, so the latest NAV is yesterday's.
    const navDate = iso(Date.now() - DAY);
    const holdings: ProviderHolding[] = [];
    for (const [code, units] of unitsByScheme) {
      if (units <= 0.0001) continue;
      const sc = SCHEMES.find((s) => s.code === code)!;
      const nav = navOn(code, navDate);
      holdings.push({
        folioNumber: PLANS[ref].folio,
        schemeCode: code,
        schemeName: sc.name,
        assetClass: sc.assetClass,
        units: round4(units),
        nav,
        navDate,
        marketValue: round2(round4(units) * nav),
      });
    }
    return { investorRef: ref, asOf: new Date().toISOString(), holdings };
  },

  async getTransactions(ref, from, to, cursor) {
    maybeFail();
    const all = buildTransactions(ref, iso(Date.now())).filter((t) => t.txnDate >= from && t.txnDate <= to);
    const start = cursor ? Number(cursor) : 0;
    const page = all.slice(start, start + 100);
    return { items: page, nextCursor: start + 100 < all.length ? String(start + 100) : null };
  },

  async getSipDetails(ref): Promise<ProviderSip[]> {
    maybeFail();
    const plan = PLANS[ref];
    if (!plan) return [];
    const today = iso(Date.now());
    const txns = buildTransactions(ref, today);
    return plan.sips.map((sip) => {
      const last = txns.find((t) => t.txnRef.startsWith(`${ref}-${sip.mandate}-`));
      const now = new Date();
      let next: string | null = null;
      if (sip.status === "ACTIVE") {
        const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), sip.day));
        if (iso(candidate.getTime()) <= today) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
        next = iso(candidate.getTime());
      }
      return {
        mandateRef: sip.mandate,
        schemeCode: sip.code,
        schemeName: SCHEMES.find((s) => s.code === sip.code)!.name,
        amount: sip.amount,
        frequency: "MONTHLY",
        nextDueDate: next,
        status: sip.status,
        lastInstallmentStatus: last?.status ?? null,
      };
    });
  },
};
