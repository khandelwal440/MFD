import { executeTool, type ToolContext } from "./tools";
import { dateLabel, dateTimeLabel, inr, pct, signedInr, TXN_LABEL } from "../format";
import type { Freshness, HoldingView, PortfolioSummary } from "../services/portfolio";

// Rule-based assistant used when no Anthropic credentials are configured.
// It calls the same allowlisted tools, so the data path and permission
// checks are identical; only the language understanding is simpler.

const FAQ: { match: RegExp; answer: string }[] = [
  { match: /\bnav\b|net asset value/i, answer: "NAV (Net Asset Value) is the per-unit price of a mutual fund scheme, published by the AMC at the end of each business day. Your holding value is units × the latest NAV." },
  { match: /\bxirr\b/i, answer: "XIRR is an annualised return that accounts for the timing of every investment and withdrawal — useful for SIPs, where money goes in on different dates. We calculate it from your successful transactions and today's value." },
  { match: /exit load/i, answer: "An exit load is a fee some schemes charge if you redeem within a set period (often 1 year for equity funds). The exact load is in each scheme's Key Information Memorandum." },
  { match: /direct|regular plan/i, answer: "Direct plans are bought straight from the AMC and have a lower expense ratio. Regular plans are bought through a distributor and include distributor commission in the expense ratio." },
  { match: /\bcas\b|statement/i, answer: "A Consolidated Account Statement (CAS) lists all your mutual fund holdings across AMCs. Statement downloads aren't enabled in this portal yet; you can request one from MF Central or raise a support request here." },
  { match: /what is (a )?sip|how does sip/i, answer: "A SIP (Systematic Investment Plan) invests a fixed amount on a schedule (usually monthly) via an auto-debit mandate, buying units at that day's NAV." },
];

function freshnessNote(f: Freshness) {
  if (f.status === "fresh") return `Data as of ${dateTimeLabel(f.asOf)}.`;
  if (f.status === "stale") return `⚠️ This data may be out of date — last successful sync ${dateTimeLabel(f.asOf)}.`;
  return "⚠️ Portfolio data is currently unavailable from the provider.";
}

export async function offlineReply(message: string, ctx: ToolContext, toolsUsed: string[]): Promise<string> {
  const m = message.toLowerCase();
  const call = async (name: string, input: unknown = {}) => {
    toolsUsed.push(name);
    return executeTool(name, input, ctx);
  };

  if (/(buy|invest|purchase|redeem|sell|withdraw|switch|cancel|stop|pause|start).{0,30}(fund|sip|units|money|scheme|now)/i.test(message) && !/status|history|last|when/i.test(m)) {
    return "I can't place, change or cancel transactions — those aren't available in the portal yet. I can raise a support request so our team can help you. Just say \"raise a support request\".";
  }
  if (/\b(?!my\b)[a-z]+['’]s (portfolio|holdings?|account|sips?|investments?|transactions?)\b/i.test(message) || /someone else|another (person|investor)|other (people|investors)/i.test(m)) {
    return "I can only show the portfolio of the investor who is signed in. If someone else invests with us, they can sign in with their own login.";
  }
  if (/should i|recommend|which fund|best fund|good fund/i.test(m)) {
    return "I can't give personalised investment advice, but I can explain how your current holdings are doing or how a concept works. For advice, please speak with your distributor.";
  }
  if (/support|ticket|complain|help from|talk to|human|agent|wrong|incorrect|mismatch/i.test(m)) {
    const r = await call("draft_support_request", { category: /sip|mandate/.test(m) ? "sip_mandate" : /statement|cas/.test(m) ? "statement_request" : /transaction|redemption|purchase/.test(m) ? "transaction_status" : /value|holding|portfolio/.test(m) ? "portfolio_data" : "other", description: message.slice(0, 500) });
    if (!r.ok) return `I couldn't prepare that request: ${r.message}`;
    return "I've drafted a support request from your message. Please review it below and press **Confirm** to submit — nothing is sent until you do.";
  }
  if (/sip|mandate|instal/i.test(m)) {
    const r = await call("get_sip_details");
    if (!r.ok) return r.message;
    const d = r.data as { sips: { schemeName: string; amount: number; status: string; nextDueDate: string | null; lastInstallmentStatus: string | null }[]; freshness: Freshness };
    if (!d.sips.length) return `You don't have any SIP mandates on record. ${freshnessNote(d.freshness)}`;
    const lines = d.sips.map((s) => `• **${s.schemeName}** — ${inr(s.amount)}/month, ${s.status.toLowerCase()}${s.nextDueDate ? `, next due ${dateLabel(s.nextDueDate)}` : ""}${s.lastInstallmentStatus ? ` (last instalment: ${s.lastInstallmentStatus.toLowerCase()})` : ""}`);
    return `Your SIPs:\n${lines.join("\n")}\n\n${freshnessNote(d.freshness)}`;
  }
  if (/transaction|history|recent|last (purchase|redemption)|activity/i.test(m)) {
    const r = await call("get_transaction_history", { from: null, to: null, type: null, limit: 5 });
    if (!r.ok) return r.message;
    const d = r.data as { transactions: { date: string; schemeName: string; type: string; amount: number; status: string }[]; freshness: Freshness };
    const lines = d.transactions.map((t) => `• ${dateLabel(t.date)} — ${TXN_LABEL[t.type]} of ${inr(t.amount)} in ${t.schemeName} (${t.status.toLowerCase()})`);
    return `Your 5 most recent transactions:\n${lines.join("\n")}\n\n${freshnessNote(d.freshness)}`;
  }
  const holdingsAsked = /\bholdings?\b|\bfolios?\b|\bunits\b/i.test(m);
  if (!holdingsAsked && /portfolio|worth|value|return|gain|loss|profit|invested|total|performance|how am i doing/i.test(m)) {
    const r = await call("get_portfolio_summary");
    if (!r.ok) return r.message;
    const s = r.data as PortfolioSummary;
    if (s.freshness.status === "unavailable") return freshnessNote(s.freshness);
    return [
      s.freshness.status === "stale" ? freshnessNote(s.freshness) + "\n" : "",
      `Your portfolio is worth **${inr(s.currentValue)}** across ${s.holdingsCount} schemes.`,
      `• Net invested: ${inr(s.investedAmount)}`,
      `• Gain/loss: ${signedInr(s.absoluteGainLoss)} (${pct(s.absoluteReturnPct)})`,
      `• XIRR: ${pct(s.xirrPct)}`,
      s.freshness.status === "fresh" ? `\n${freshnessNote(s.freshness)}` : "",
    ].join("\n").trim();
  }
  if ((holdingsAsked || /\b(schemes?|funds?)\b/i.test(m)) && !FAQ.some((f) => f.match.test(message))) {
    const r = await call("get_holdings", { category: null, name_contains: null });
    if (!r.ok) return r.message;
    const d = r.data as { holdings: HoldingView[]; freshness: Freshness };
    const lines = d.holdings.map((h) => `• **${h.schemeName}** — ${inr(h.currentValue)} (${signedInr(h.gainLoss)} vs invested)`);
    return `You hold ${d.holdings.length} schemes:\n${lines.join("\n")}\n\n${freshnessNote(d.freshness)}`;
  }
  const faq = FAQ.find((f) => f.match.test(message));
  if (faq) return faq.answer;
  return "I can help with your portfolio value and returns, holdings, recent transactions, SIPs, and general mutual fund questions — or raise a support request. What would you like to know?\n\n_(Offline assistant mode: set ANTHROPIC_API_KEY for full conversational answers.)_";
}
