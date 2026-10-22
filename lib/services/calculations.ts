import type { Transaction } from "../db/types";

// Deterministic calculation rules (blueprint section 5). The UI shows these
// definitions next to the numbers.

export const DEFINITIONS = {
  currentValue: "Provider-reported market value; where absent, units × latest NAV. NAV date shown per holding.",
  investedAmount:
    "Net cash invested: successful purchases, SIP instalments and switch-ins, minus redemption and switch-out amounts. Pending and failed transactions are excluded.",
  absoluteGainLoss: "Current value minus net cash invested.",
  xirr: "Annualised return from dated, successful cash flows plus today's value. Not shown when history is under 30 days.",
};

const INFLOW: Transaction["type"][] = ["PURCHASE", "SIP", "SWITCH_IN"];

export function netInvested(txns: Transaction[]): number {
  let total = 0;
  for (const t of txns) {
    if (t.status !== "SUCCESS") continue;
    total += INFLOW.includes(t.type) ? t.amount : -t.amount;
  }
  return round2(total);
}

export interface CashFlow {
  date: string; // YYYY-MM-DD
  amount: number; // investor perspective: money out negative, money in positive
}

export function cashFlows(txns: Transaction[], currentValue: number, asOfDate: string): CashFlow[] {
  const flows: CashFlow[] = txns
    .filter((t) => t.status === "SUCCESS")
    .map((t) => ({ date: t.transactionDate, amount: INFLOW.includes(t.type) ? -t.amount : t.amount }));
  flows.push({ date: asOfDate, amount: currentValue });
  return flows;
}

const DAY = 86_400_000;

function npv(rate: number, flows: CashFlow[], t0: number) {
  let v = 0;
  for (const f of flows) v += f.amount / Math.pow(1 + rate, (Date.parse(f.date) - t0) / DAY / 365);
  return v;
}

// Returns the annualised rate, or null when it can't be determined reliably.
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasNeg = flows.some((f) => f.amount < 0);
  const hasPos = flows.some((f) => f.amount > 0);
  if (!hasNeg || !hasPos) return null;
  const t0 = Math.min(...flows.map((f) => Date.parse(f.date)));
  const span = (Math.max(...flows.map((f) => Date.parse(f.date))) - t0) / DAY;
  if (span < 30) return null;

  // Bisection on a wide bracket: slower than Newton but never diverges.
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo, flows, t0);
  const fHi = npv(hi, flows, t0);
  if (Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows, t0);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-10) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
