import { describe, expect, it } from "vitest";
import { netInvested, xirr } from "@/lib/services/calculations";
import type { Transaction } from "@/lib/db/types";

const txn = (type: Transaction["type"], amount: number, status: Transaction["status"] = "SUCCESS", date = "2024-01-01"): Transaction => ({
  id: "x",
  accountId: "a",
  providerTxnRef: Math.random().toString(),
  schemeRef: "S",
  schemeName: "S",
  type,
  amount,
  units: 1,
  nav: 1,
  status,
  transactionDate: date,
  updatedAt: date,
});

describe("netInvested", () => {
  it("adds inflows and subtracts outflows", () => {
    expect(netInvested([txn("PURCHASE", 1000), txn("SIP", 500), txn("REDEMPTION", 300), txn("SWITCH_IN", 200), txn("SWITCH_OUT", 100)])).toBe(1300);
  });
  it("ignores pending and failed transactions", () => {
    expect(netInvested([txn("SIP", 500), txn("SIP", 500, "FAILED"), txn("SIP", 500, "PENDING")])).toBe(500);
  });
});

describe("xirr", () => {
  it("returns 10% for a one-year 10% gain", () => {
    const r = xirr([
      { date: "2023-01-01", amount: -10000 },
      { date: "2024-01-01", amount: 11000 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.1, 5);
  });
  it("handles losses", () => {
    const r = xirr([
      { date: "2023-01-01", amount: -10000 },
      { date: "2024-01-01", amount: 9000 },
    ]);
    expect(r!).toBeCloseTo(-0.1, 5);
  });
  it("returns null without both signs or with under 30 days of history", () => {
    expect(xirr([{ date: "2023-01-01", amount: -100 }, { date: "2023-02-01", amount: -100 }])).toBeNull();
    expect(xirr([{ date: "2023-01-01", amount: -100 }, { date: "2023-01-10", amount: 110 }])).toBeNull();
  });
});
