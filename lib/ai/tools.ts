import type Anthropic from "@anthropic-ai/sdk";
import type { SchemeCategory, SupportCategory, TxnType } from "../db/types";
import { AccessError, getHoldings, getPortfolioSummary, getSips, getTransactions } from "../services/portfolio";
import { SUPPORT_CATEGORIES, validateSupportInput } from "../services/support";
import { audit } from "../audit";

// Allowlisted, read-only tools (blueprint section 6). None of them accepts an
// investor, user or account id: identity comes from the session only.

const CATEGORIES: SchemeCategory[] = ["Equity", "Debt", "Hybrid", "Index"];
const TXN_TYPES: TxnType[] = ["PURCHASE", "SIP", "REDEMPTION", "SWITCH_IN", "SWITCH_OUT"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_portfolio_summary",
    description:
      "Get the signed-in investor's portfolio summary: current value, net invested amount, absolute gain/loss, XIRR, asset allocation, data as-of time and freshness status. Use for questions about total value, returns or overall performance.",
    input_schema: { type: "object", properties: {}, additionalProperties: false, required: [] },
    strict: true,
  },
  {
    name: "get_holdings",
    description:
      "List the signed-in investor's current scheme holdings with units, NAV, NAV date, value, invested amount and gain/loss. Optionally filter by asset category or a scheme-name substring.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: ["string", "null"], enum: [...CATEGORIES, null], description: "Asset category filter, or null for all" },
        name_contains: { type: ["string", "null"], description: "Case-insensitive scheme name substring, or null" },
      },
      additionalProperties: false,
      required: ["category", "name_contains"],
    },
    strict: true,
  },
  {
    name: "get_transaction_history",
    description:
      "Get the signed-in investor's transactions (purchases, SIP instalments, redemptions, switches) with status, newest first. Date range is optional; at most 50 rows are returned.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: ["string", "null"], description: "Start date YYYY-MM-DD, or null" },
        to: { type: ["string", "null"], description: "End date YYYY-MM-DD, or null" },
        type: { type: ["string", "null"], enum: [...TXN_TYPES, null], description: "Transaction type filter, or null" },
        limit: { type: "integer", description: "Rows to return, 1-50" },
      },
      additionalProperties: false,
      required: ["from", "to", "type", "limit"],
    },
    strict: true,
  },
  {
    name: "get_sip_details",
    description: "List the signed-in investor's SIP mandates: scheme, amount, frequency, status, next due date and last instalment status.",
    input_schema: { type: "object", properties: {}, additionalProperties: false, required: [] },
    strict: true,
  },
  {
    name: "get_statement_status",
    description: "Check whether account statements (CAS) can be generated through the portal for the signed-in investor.",
    input_schema: { type: "object", properties: {}, additionalProperties: false, required: [] },
    strict: true,
  },
  {
    name: "draft_support_request",
    description:
      "Prepare a support request for the investor to review. This does NOT submit anything: the investor must press Confirm in the chat. Use when data is missing, stale or wrong, or the investor asks for human help. Keep the description short and free of PAN, bank or folio numbers.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: SUPPORT_CATEGORIES.map((c) => c.id) },
        description: { type: "string", description: "Concise description of the issue, 10-500 characters" },
      },
      additionalProperties: false,
      required: ["category", "description"],
    },
    strict: true,
  },
];

export interface SupportDraft {
  category: SupportCategory;
  categoryLabel: string;
  description: string;
}

export interface ToolContext {
  userId: string;
  requestId: string;
  onSupportDraft?: (draft: SupportDraft) => void;
}

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string; message: string };

const ALLOWED = new Set(TOOL_DEFINITIONS.map((t) => t.name));

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function executeTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (!ALLOWED.has(name)) return { ok: false, error: "UNKNOWN_TOOL", message: "That tool is not available." };
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Record<string, unknown>;
  const purpose = "ai_assistant" as const;
  try {
    let data: unknown;
    switch (name) {
      case "get_portfolio_summary":
        data = await getPortfolioSummary(ctx.userId, purpose);
        break;
      case "get_holdings": {
        const category = CATEGORIES.find((c) => c === input.category);
        const nameContains = str(input.name_contains)?.slice(0, 60);
        data = await getHoldings(ctx.userId, { category, nameContains }, purpose);
        break;
      }
      case "get_transaction_history": {
        const from = str(input.from);
        const to = str(input.to);
        if ((from && !DATE.test(from)) || (to && !DATE.test(to))) {
          return { ok: false, error: "INVALID_ARGUMENT", message: "Dates must be YYYY-MM-DD." };
        }
        const type = TXN_TYPES.find((t) => t === input.type);
        const limit = typeof input.limit === "number" ? input.limit : 20;
        data = await getTransactions(ctx.userId, { from, to, type, limit }, purpose);
        break;
      }
      case "get_sip_details":
        data = await getSips(ctx.userId, purpose);
        break;
      case "get_statement_status":
        data = {
          available: false,
          reason: "Statement generation is not yet enabled for this portal. It depends on provider (CAMS/KFintech) API approval.",
          alternative: "The investor can raise a statement_request support case, or request a CAS directly from MF Central.",
        };
        break;
      case "draft_support_request": {
        const v = validateSupportInput({ category: input.category, description: input.description });
        if (!v.ok) return { ok: false, error: "INVALID_ARGUMENT", message: v.message };
        const draft: SupportDraft = {
          category: v.category,
          categoryLabel: SUPPORT_CATEGORIES.find((c) => c.id === v.category)!.label,
          description: v.description.slice(0, 500),
        };
        ctx.onSupportDraft?.(draft);
        data = { status: "awaiting_investor_confirmation", draft, note: "Not submitted. The investor must press Confirm in the chat." };
        break;
      }
    }
    audit({ actorType: "user", actorId: ctx.userId, action: `ai.tool.${name}`, targetType: "tool", targetId: name, outcome: "success", requestId: ctx.requestId });
    return { ok: true, data };
  } catch (e) {
    audit({ actorType: "user", actorId: ctx.userId, action: `ai.tool.${name}`, targetType: "tool", targetId: name, outcome: "failure", requestId: ctx.requestId });
    if (e instanceof AccessError) {
      return {
        ok: false,
        error: e.code,
        message: e.code === "CONSENT_REQUIRED" ? "The investor has not consented to assistant access to account data." : "No verified investor account is linked.",
      };
    }
    console.error("[ai.tool]", name, e instanceof Error ? e.message : e);
    return { ok: false, error: "TEMP_UNAVAILABLE", message: "The data service is temporarily unavailable." };
  }
}
