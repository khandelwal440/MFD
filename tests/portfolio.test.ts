import { beforeEach, describe, expect, it } from "vitest";
import { resetStoreForTests, type Store } from "@/lib/db/store";
import { AccessError, getHoldings, getPortfolioSummary, getTransactions } from "@/lib/services/portfolio";
import { syncAccount } from "@/lib/sync/worker";
import { mockControls } from "@/lib/providers/mock";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { redactSensitive } from "@/lib/services/support";

let store: Store;
const userId = (email: string) => store.users.find((u) => u.loginSubject === email)!.id;

beforeEach(() => {
  store = resetStoreForTests();
  mockControls.failMode = "none";
  mockControls.failuresRemaining = 0;
});

describe("account isolation", () => {
  it("each investor sees only their own holdings", async () => {
    const a = await getHoldings(userId("priya@example.test"));
    const b = await getHoldings(userId("rahul@example.test"));
    expect(a.holdings.length).toBeGreaterThan(0);
    expect(b.holdings.length).toBeGreaterThan(0);
    const aFolios = new Set(a.holdings.map((h) => h.folio));
    expect(b.holdings.some((h) => aFolios.has(h.folio))).toBe(false);
  });

  it("admins and unlinked users have no portfolio access", async () => {
    await expect(getPortfolioSummary(userId("admin@example.test"))).rejects.toBeInstanceOf(AccessError);
  });

  it("withdrawn consent blocks access", async () => {
    const id = userId("priya@example.test");
    store.consents.find((c) => c.userId === id && c.purpose === "portfolio_display")!.withdrawnAt = new Date().toISOString();
    await expect(getHoldings(id)).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  });

  it("AI tools ignore injected identifiers and only return the caller's data", async () => {
    const priya = userId("priya@example.test");
    const rahul = userId("rahul@example.test");
    const own = await getHoldings(rahul);
    const r = await executeTool("get_holdings", { category: null, name_contains: null, user_id: priya, investor_ref: "MOCK-INV-1001" }, { userId: rahul, requestId: "t" });
    if (!r.ok) throw new Error(r.message);
    expect((r.data as { holdings: unknown[] }).holdings).toEqual(own.holdings);
  });

  it("no tool schema accepts an identity field", () => {
    for (const t of TOOL_DEFINITIONS) {
      const props = Object.keys((t.input_schema as { properties?: object }).properties ?? {});
      expect(props.some((p) => /user|investor|account|pan|folio/i.test(p))).toBe(false);
    }
  });

  it("rejects tools that are not allowlisted", async () => {
    const r = await executeTool("place_order", { amount: 1000 }, { userId: userId("priya@example.test"), requestId: "t" });
    expect(r).toMatchObject({ ok: false, error: "UNKNOWN_TOOL" });
  });
});

describe("sync", () => {
  it("is idempotent: re-running does not duplicate transactions", async () => {
    const account = store.investorAccounts[0];
    await syncAccount(account);
    const count = store.transactions.length;
    await syncAccount(account);
    expect(store.transactions.length).toBe(count);
  });

  it("marks data stale when the provider fails after a good sync", async () => {
    const id = userId("priya@example.test");
    const before = await getPortfolioSummary(id);
    expect(before.freshness.status).toBe("fresh");
    mockControls.failMode = "TEMP_UNAVAILABLE";
    mockControls.failuresRemaining = -1;
    const job = await syncAccount(store.investorAccounts.find((a) => a.userId === id)!);
    expect(job.status).toBe("failed");
    expect(job.attempts).toBe(3); // bounded retries for a transient error
    const after = await getPortfolioSummary(id);
    expect(after.freshness.status).toBe("stale");
    expect(after.currentValue).toBe(before.currentValue); // last good figures retained
  });

  it("does not retry non-transient errors", async () => {
    mockControls.failMode = "AUTH_EXPIRED";
    mockControls.failuresRemaining = -1;
    const job = await syncAccount(store.investorAccounts[0]);
    expect(job.attempts).toBe(1);
    expect(job.errorCode).toBe("AUTH_EXPIRED");
  });

  it("caps transaction page size", async () => {
    const r = await getTransactions(userId("priya@example.test"), { limit: 10_000 });
    expect(r.transactions.length).toBeLessThanOrEqual(50);
  });
});

describe("redaction", () => {
  it("removes PAN, long numbers and emails", () => {
    expect(redactSensitive("PAN ABCDE1234F folio 1098765432 mail a@b.com")).toBe("PAN [PAN removed] folio [number removed] mail [email removed]");
  });
});
