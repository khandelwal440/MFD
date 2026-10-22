import { db } from "../db/store";
import type { InvestorAccount, SchemeCategory, TxnType } from "../db/types";
import { STALE_AFTER_MS } from "../config";
import { ensureFresh, lastJob } from "../sync/worker";
import { getProvider } from "../providers/registry";
import { cashFlows, netInvested, round2, xirr } from "./calculations";

// Every function here takes the authenticated user id from the session and
// resolves that user's own verified accounts. Callers can never pass an
// account or investor id, so there's nothing to tamper with (IDOR/BOLA).

export class AccessError extends Error {
  constructor(public code: "NO_LINKED_ACCOUNT" | "CONSENT_REQUIRED") {
    super(code);
  }
}

function accountsFor(userId: string, purpose: "portfolio_display" | "ai_assistant" = "portfolio_display"): InvestorAccount[] {
  const store = db();
  const consent = store.consents.find((c) => c.userId === userId && c.purpose === purpose && !c.withdrawnAt);
  if (!consent) throw new AccessError("CONSENT_REQUIRED");
  const accounts = store.investorAccounts.filter((a) => a.userId === userId && a.status === "verified");
  if (accounts.length === 0) throw new AccessError("NO_LINKED_ACCOUNT");
  return accounts;
}

export type FreshnessStatus = "fresh" | "stale" | "unavailable";

export interface Freshness {
  status: FreshnessStatus;
  asOf: string | null;
  lastAttemptAt: string | null;
  message: string;
  sources: string[];
}

function freshnessFor(accounts: InvestorAccount[]): Freshness {
  let status: FreshnessStatus = "fresh";
  let asOf: string | null = null;
  let lastAttemptAt: string | null = null;
  for (const a of accounts) {
    const ok = lastJob(a.id, "success");
    const latest = lastJob(a.id);
    if (latest?.completedAt && (!lastAttemptAt || latest.completedAt > lastAttemptAt)) lastAttemptAt = latest.completedAt;
    if (!ok) {
      status = "unavailable";
      continue;
    }
    const okAt = ok.completedAt!;
    if (!asOf || okAt < asOf) asOf = okAt; // oldest account determines overall freshness
    const failedSince = latest && latest.status === "failed" && latest.startedAt > okAt;
    if (status !== "unavailable" && (failedSince || Date.now() - Date.parse(okAt) > STALE_AFTER_MS)) status = "stale";
  }
  const message =
    status === "fresh"
      ? "Data synced from the provider. Values use the latest published NAV."
      : status === "stale"
        ? "We couldn't refresh from the provider recently. Figures below are from the last successful sync and may be out of date."
        : "Portfolio data is temporarily unavailable from the provider. Please try again later or raise a support request.";
  return { status, asOf, lastAttemptAt, message, sources: [...new Set(accounts.map((a) => getProvider(a.provider).label))] };
}

async function load(userId: string, purpose?: "portfolio_display" | "ai_assistant") {
  const accounts = accountsFor(userId, purpose);
  await ensureFresh(accounts);
  const ids = new Set(accounts.map((a) => a.id));
  const store = db();
  return {
    accounts,
    holdings: store.holdings.filter((h) => ids.has(h.accountId)),
    transactions: store.transactions.filter((t) => ids.has(t.accountId)),
    sips: store.sipMandates.filter((s) => ids.has(s.accountId)),
    freshness: freshnessFor(accounts),
  };
}

export interface PortfolioSummary {
  currentValue: number;
  investedAmount: number;
  absoluteGainLoss: number;
  absoluteReturnPct: number | null;
  xirrPct: number | null;
  currency: "INR";
  holdingsCount: number;
  allocation: { category: SchemeCategory; value: number; pct: number }[];
  asOf: string | null;
  freshness: Freshness;
}

export async function getPortfolioSummary(userId: string, purpose?: "portfolio_display" | "ai_assistant"): Promise<PortfolioSummary> {
  const { holdings, transactions, freshness } = await load(userId, purpose);
  const currentValue = round2(holdings.reduce((s, h) => s + h.value, 0));
  const investedAmount = netInvested(transactions);
  const gain = round2(currentValue - investedAmount);
  const byCat = new Map<SchemeCategory, number>();
  for (const h of holdings) byCat.set(h.category, (byCat.get(h.category) ?? 0) + h.value);
  const asOfDate = (freshness.asOf ?? new Date().toISOString()).slice(0, 10);
  const rate = holdings.length ? xirr(cashFlows(transactions, currentValue, asOfDate)) : null;
  return {
    currentValue,
    investedAmount,
    absoluteGainLoss: gain,
    absoluteReturnPct: investedAmount > 0 ? round2((gain / investedAmount) * 100) : null,
    xirrPct: rate === null ? null : round2(rate * 100),
    currency: "INR",
    holdingsCount: holdings.length,
    allocation: [...byCat.entries()]
      .map(([category, value]) => ({ category, value: round2(value), pct: currentValue ? round2((value / currentValue) * 100) : 0 }))
      .sort((a, b) => b.value - a.value),
    asOf: freshness.asOf,
    freshness,
  };
}

export interface HoldingView {
  schemeName: string;
  category: SchemeCategory;
  folio: string;
  units: number;
  nav: number;
  navDate: string;
  currentValue: number;
  investedAmount: number;
  gainLoss: number;
  asOf: string;
  source: string;
}

export async function getHoldings(
  userId: string,
  filters: { category?: SchemeCategory; nameContains?: string } = {},
  purpose?: "portfolio_display" | "ai_assistant",
): Promise<{ holdings: HoldingView[]; freshness: Freshness }> {
  const { holdings, transactions, freshness, accounts } = await load(userId, purpose);
  const providerOf = new Map(accounts.map((a) => [a.id, getProvider(a.provider).label]));
  const out = holdings
    .filter((h) => !filters.category || h.category === filters.category)
    .filter((h) => !filters.nameContains || h.schemeName.toLowerCase().includes(filters.nameContains.toLowerCase()))
    .map((h) => {
      // Key on account + scheme, never the display name.
      const invested = netInvested(transactions.filter((t) => t.accountId === h.accountId && t.schemeRef === h.schemeRef));
      return {
        schemeName: h.schemeName,
        category: h.category,
        folio: h.folioRef,
        units: h.units,
        nav: h.nav,
        navDate: h.navDate,
        currentValue: h.value,
        investedAmount: invested,
        gainLoss: round2(h.value - invested),
        asOf: h.asOf,
        source: providerOf.get(h.accountId) ?? "unknown",
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue);
  return { holdings: out, freshness };
}

export interface TxnQuery {
  from?: string;
  to?: string;
  type?: TxnType;
  limit?: number;
  cursor?: number;
}

export const MAX_PAGE = 50;

export async function getTransactions(userId: string, q: TxnQuery = {}, purpose?: "portfolio_display" | "ai_assistant") {
  const { transactions, freshness } = await load(userId, purpose);
  const limit = Math.min(Math.max(1, q.limit ?? 20), MAX_PAGE);
  const start = Math.max(0, q.cursor ?? 0);
  const rows = transactions
    .filter((t) => (!q.from || t.transactionDate >= q.from) && (!q.to || t.transactionDate <= q.to))
    .filter((t) => !q.type || t.type === q.type)
    .sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : a.transactionDate > b.transactionDate ? -1 : 0));
  const page = rows.slice(start, start + limit).map((t) => ({
    date: t.transactionDate,
    schemeName: t.schemeName,
    type: t.type,
    amount: t.amount,
    units: t.units,
    nav: t.nav,
    status: t.status,
    reference: `…${t.providerTxnRef.slice(-6)}`,
  }));
  return { transactions: page, total: rows.length, nextCursor: start + limit < rows.length ? start + limit : null, freshness };
}

export async function getSips(userId: string, purpose?: "portfolio_display" | "ai_assistant") {
  const { sips, freshness } = await load(userId, purpose);
  return {
    sips: sips.map((s) => ({
      mandate: `…${s.providerMandateRef.slice(-4)}`,
      schemeName: s.schemeName,
      amount: s.amount,
      frequency: s.frequency,
      status: s.status,
      nextDueDate: s.nextDueDate,
      lastInstallmentStatus: s.lastInstallmentStatus,
    })),
    freshness,
  };
}

export async function getSyncStatus(userId: string) {
  const accounts = accountsFor(userId);
  return freshnessFor(accounts);
}
