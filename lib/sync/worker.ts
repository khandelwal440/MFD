import { db, newId } from "../db/store";
import type { HoldingSnapshot, InvestorAccount, SchemeCategory, SipMandate, SyncJob, Transaction, TxnStatus, TxnType } from "../db/types";
import { getProvider } from "../providers/registry";
import { toProviderError, type ProviderError } from "../providers/errors";
import { audit } from "../audit";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 150;
const AUTO_REFRESH_MS = 15 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retries transient failures only, with bounded exponential backoff + jitter.
async function withRetry<T>(fn: () => Promise<T>, onAttempt: () => void): Promise<T> {
  let last: ProviderError | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    onAttempt();
    try {
      return await fn();
    } catch (e) {
      last = toProviderError(e);
      if (!last.transient || attempt === MAX_ATTEMPTS - 1) throw last;
      await sleep(BASE_DELAY_MS * 2 ** attempt + Math.random() * BASE_DELAY_MS);
    }
  }
  throw last;
}

export function maskFolio(folio: string): string {
  return `XXXXXX${folio.slice(-4)}`;
}

const CATEGORY: Record<string, SchemeCategory> = { Equity: "Equity", Debt: "Debt", Hybrid: "Hybrid", Index: "Index" };
const TXN_TYPES: TxnType[] = ["PURCHASE", "SIP", "REDEMPTION", "SWITCH_IN", "SWITCH_OUT"];
const TXN_STATUSES: TxnStatus[] = ["SUCCESS", "PENDING", "FAILED", "REJECTED"];

// In-flight syncs per account, so concurrent requests share one provider call.
const g = globalThis as unknown as { __mfpInflight?: Map<string, Promise<SyncJob>> };
const inflight = (g.__mfpInflight ??= new Map());

export function syncAccount(account: InvestorAccount): Promise<SyncJob> {
  const existing = inflight.get(account.id);
  if (existing) return existing;
  const p = runSync(account).finally(() => inflight.delete(account.id));
  inflight.set(account.id, p);
  return p;
}

async function runSync(account: InvestorAccount): Promise<SyncJob> {
  const store = db();
  const provider = getProvider(account.provider);
  const job: SyncJob = {
    id: newId(),
    provider: account.provider,
    accountId: account.id,
    jobType: "full_refresh",
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    errorCode: null,
    recordCount: 0,
    attempts: 0,
  };
  store.syncJobs.push(job);
  const bump = () => void job.attempts++;

  try {
    const portfolio = await withRetry(() => provider.getPortfolio(account.providerInvestorRef), bump);
    const txns: Awaited<ReturnType<typeof provider.getTransactions>>["items"] = [];
    let cursor: string | undefined;
    do {
      const page = await withRetry(
        () => provider.getTransactions(account.providerInvestorRef, "2000-01-01", new Date().toISOString().slice(0, 10), cursor),
        bump,
      );
      txns.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    const sips = provider.getSipDetails ? await withRetry(() => provider.getSipDetails!(account.providerInvestorRef), bump) : [];

    // Holdings: replace this account's snapshot set in one step.
    const holdings: HoldingSnapshot[] = portfolio.holdings.map((h) => ({
      id: newId(),
      accountId: account.id,
      schemeRef: h.schemeCode,
      schemeName: h.schemeName,
      category: CATEGORY[h.assetClass] ?? "Equity",
      folioRef: maskFolio(h.folioNumber),
      units: h.units,
      nav: h.nav,
      navDate: h.navDate,
      // Prefer the provider-reported value; otherwise units x NAV.
      value: h.marketValue ?? Math.round(h.units * h.nav * 100) / 100,
      asOf: portfolio.asOf,
      sourceRef: `${account.provider}:${portfolio.asOf}`,
    }));
    store.holdings = store.holdings.filter((x) => x.accountId !== account.id).concat(holdings);

    // Transactions: idempotent upsert keyed on the provider transaction id.
    for (const t of txns) {
      const type = TXN_TYPES.includes(t.txnType as TxnType) ? (t.txnType as TxnType) : null;
      const status = TXN_STATUSES.includes(t.status as TxnStatus) ? (t.status as TxnStatus) : "PENDING";
      if (!type) continue;
      const existing = store.transactions.find((x) => x.accountId === account.id && x.providerTxnRef === t.txnRef);
      const row: Transaction = {
        id: existing?.id ?? newId(),
        accountId: account.id,
        providerTxnRef: t.txnRef,
        schemeRef: t.schemeCode,
        schemeName: t.schemeName,
        type,
        amount: t.amount,
        units: t.units,
        nav: t.nav,
        status,
        transactionDate: t.txnDate,
        updatedAt: t.lastUpdated,
      };
      if (existing) Object.assign(existing, row);
      else store.transactions.push(row);
    }

    for (const s of sips) {
      const existing = store.sipMandates.find((x) => x.accountId === account.id && x.providerMandateRef === s.mandateRef);
      const row: SipMandate = {
        id: existing?.id ?? newId(),
        accountId: account.id,
        providerMandateRef: s.mandateRef,
        schemeRef: s.schemeCode,
        schemeName: s.schemeName,
        amount: s.amount,
        frequency: s.frequency === "QUARTERLY" ? "QUARTERLY" : "MONTHLY",
        nextDueDate: s.nextDueDate,
        status: s.status === "PAUSED" ? "PAUSED" : s.status === "CANCELLED" ? "CANCELLED" : "ACTIVE",
        lastInstallmentStatus: TXN_STATUSES.includes(s.lastInstallmentStatus as TxnStatus) ? (s.lastInstallmentStatus as TxnStatus) : null,
      };
      if (existing) Object.assign(existing, row);
      else store.sipMandates.push(row);
    }

    job.status = "success";
    job.recordCount = holdings.length + txns.length + sips.length;
  } catch (e) {
    const err = toProviderError(e);
    job.status = "failed";
    job.errorCode = err.code;
    console.warn(`[sync] ${account.provider} account ${account.id} failed: ${err.code}`);
  } finally {
    job.completedAt = new Date().toISOString();
    audit({ actorType: "system", actorId: null, action: "sync.full_refresh", targetType: "investor_account", targetId: account.id, outcome: job.status === "success" ? "success" : "failure" });
  }
  return job;
}

export function lastJob(accountId: string, status?: SyncJob["status"]): SyncJob | undefined {
  const jobs = db().syncJobs;
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (jobs[i].accountId === accountId && (!status || jobs[i].status === status)) return jobs[i];
  }
  return undefined;
}

// Called on read: first-ever load waits for a sync; afterwards data older
// than AUTO_REFRESH_MS is refreshed in the background (stale-while-revalidate).
export async function ensureFresh(accounts: InvestorAccount[]) {
  await Promise.all(
    accounts.map(async (a) => {
      const ok = lastJob(a.id, "success");
      if (!ok) {
        const any = lastJob(a.id);
        // Don't hammer a failing provider on every page view.
        if (!any || Date.now() - Date.parse(any.completedAt ?? any.startedAt) > 60_000) await syncAccount(a);
        return;
      }
      if (Date.now() - Date.parse(ok.completedAt!) > AUTO_REFRESH_MS) void syncAccount(a);
    }),
  );
}

export async function syncAll(): Promise<SyncJob[]> {
  const accounts = db().investorAccounts.filter((a) => a.status === "verified");
  return Promise.all(accounts.map(syncAccount));
}
