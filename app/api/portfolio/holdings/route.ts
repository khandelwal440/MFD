import { withAuth } from "@/lib/http";
import { portfolioCall } from "@/lib/api-helpers";
import { getHoldings } from "@/lib/services/portfolio";
import type { SchemeCategory } from "@/lib/db/types";

const CATEGORIES: SchemeCategory[] = ["Equity", "Debt", "Hybrid", "Index"];

export const GET = withAuth(async ({ user }, req) => {
  const url = new URL(req.url);
  const category = CATEGORIES.find((c) => c === url.searchParams.get("category"));
  return portfolioCall(() => getHoldings(user.id, { category }));
});
