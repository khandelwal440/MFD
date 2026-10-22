import { json, withAuth } from "@/lib/http";

export const GET = withAuth(async ({ user }) =>
  json({ displayName: user.displayName, role: user.role, loginSubject: user.loginSubject }),
);
