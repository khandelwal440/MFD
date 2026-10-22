import { withAuth } from "@/lib/http";
import { portfolioCall } from "@/lib/api-helpers";
import { getSyncStatus } from "@/lib/services/portfolio";

// Returns only a safe freshness view; no internal error details or credentials.
export const GET = withAuth(async ({ user }) => portfolioCall(async () => getSyncStatus(user.id)));
