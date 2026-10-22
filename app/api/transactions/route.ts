import { error, withAuth } from "@/lib/http";
import { portfolioCall } from "@/lib/api-helpers";
import { getTransactions } from "@/lib/services/portfolio";
import type { TxnType } from "@/lib/db/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: TxnType[] = ["PURCHASE", "SIP", "REDEMPTION", "SWITCH_IN", "SWITCH_OUT"];

export const GET = withAuth(async ({ user }, req) => {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") || undefined;
  const to = p.get("to") || undefined;
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return error("INVALID", "Dates must be YYYY-MM-DD", 400);
  const cursor = Number(p.get("cursor") || 0);
  const limit = Number(p.get("limit") || 20);
  if (!Number.isInteger(cursor) || !Number.isInteger(limit)) return error("INVALID", "cursor and limit must be integers", 400);
  const type = TYPES.find((t) => t === p.get("type"));
  return portfolioCall(() => getTransactions(user.id, { from, to, type, cursor, limit }));
});
