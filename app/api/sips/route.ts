import { withAuth } from "@/lib/http";
import { portfolioCall } from "@/lib/api-helpers";
import { getSips } from "@/lib/services/portfolio";

export const GET = withAuth(async ({ user }) => portfolioCall(() => getSips(user.id)));
