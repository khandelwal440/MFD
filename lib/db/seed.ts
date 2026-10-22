import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password";
import type { Store } from "./store";

// Local demo accounts only. These are test credentials for the development
// build; replace with real onboarding before any provider data is connected.
export const DEMO_USERS = [
  { loginSubject: "priya@example.test", password: "Investor@123", displayName: "Priya Sharma", role: "investor", providerRef: "MOCK-INV-1001" },
  { loginSubject: "rahul@example.test", password: "Investor@123", displayName: "Rahul Mehta", role: "investor", providerRef: "MOCK-INV-2002" },
  { loginSubject: "admin@example.test", password: "Admin@123", displayName: "Operations Admin", role: "admin", providerRef: null },
] as const;

export function seedUsers(s: Store) {
  const now = new Date().toISOString();
  for (const u of DEMO_USERS) {
    const userId = randomUUID();
    s.users.push({
      id: userId,
      loginSubject: u.loginSubject,
      displayName: u.displayName,
      role: u.role,
      passwordHash: hashPassword(u.password),
      status: "active",
      createdAt: now,
    });
    if (u.providerRef) {
      s.investorAccounts.push({
        id: randomUUID(),
        userId,
        provider: "MOCK",
        providerInvestorRef: u.providerRef,
        verifiedAt: now,
        status: "verified",
      });
      for (const purpose of ["portfolio_display", "ai_assistant"] as const) {
        s.consents.push({
          id: randomUUID(),
          userId,
          purpose,
          scope: purpose === "portfolio_display" ? "holdings,transactions,sips" : "portfolio_summary,holdings,transactions,sips",
          policyVersion: "2026-10",
          grantedAt: now,
          withdrawnAt: null,
        });
      }
    }
  }
}
