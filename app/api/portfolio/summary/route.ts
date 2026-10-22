import { withAuth } from "@/lib/http";
import { portfolioCall } from "@/lib/api-helpers";
import { getPortfolioSummary } from "@/lib/services/portfolio";

export const GET = withAuth(async ({ user }) => portfolioCall(() => getPortfolioSummary(user.id)));
