// Entities mirror lib/db/schema.sql (blueprint section 5).

export type Role = "investor" | "admin";
export type ProviderId = "MOCK" | "KFINTECH" | "CAMS" | "NSE" | "BSE";

export interface User {
  id: string;
  loginSubject: string; // login identifier (email); never used as a key elsewhere
  displayName: string;
  role: Role;
  passwordHash: string;
  status: "active" | "locked";
  createdAt: string;
}

export interface InvestorAccount {
  id: string;
  userId: string;
  provider: ProviderId;
  providerInvestorRef: string;
  verifiedAt: string | null;
  status: "verified" | "pending" | "revoked";
}

export interface Consent {
  id: string;
  userId: string;
  purpose: "portfolio_display" | "ai_assistant";
  scope: string;
  policyVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
}

export type SchemeCategory = "Equity" | "Debt" | "Hybrid" | "Index";

export interface HoldingSnapshot {
  id: string;
  accountId: string;
  schemeRef: string;
  schemeName: string;
  category: SchemeCategory;
  folioRef: string; // tokenised/masked reference only
  units: number;
  nav: number;
  navDate: string;
  value: number;
  asOf: string;
  sourceRef: string;
}

export type TxnType = "PURCHASE" | "SIP" | "REDEMPTION" | "SWITCH_IN" | "SWITCH_OUT";
export type TxnStatus = "SUCCESS" | "PENDING" | "FAILED" | "REJECTED";

export interface Transaction {
  id: string;
  accountId: string;
  providerTxnRef: string;
  schemeRef: string;
  schemeName: string;
  type: TxnType;
  amount: number;
  units: number;
  nav: number;
  status: TxnStatus;
  transactionDate: string;
  updatedAt: string;
}

export interface SipMandate {
  id: string;
  accountId: string;
  providerMandateRef: string;
  schemeRef: string;
  schemeName: string;
  amount: number;
  frequency: "MONTHLY" | "QUARTERLY";
  nextDueDate: string | null;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  lastInstallmentStatus: TxnStatus | null;
}

export interface SyncJob {
  id: string;
  provider: ProviderId;
  accountId: string;
  jobType: "full_refresh";
  startedAt: string;
  completedAt: string | null;
  status: "running" | "success" | "failed";
  errorCode: string | null;
  recordCount: number;
  attempts: number;
}

export interface SupportCase {
  id: string;
  reference: string;
  userId: string;
  category: SupportCategory;
  description: string;
  status: "open" | "in_progress" | "resolved";
  assignedTo: string | null;
  createdAt: string;
  source: "portal" | "assistant";
}

export type SupportCategory =
  | "portfolio_data"
  | "transaction_status"
  | "sip_mandate"
  | "statement_request"
  | "account_access"
  | "other";

export interface AuditEvent {
  id: string;
  actorType: "user" | "admin" | "system" | "anonymous";
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  timestamp: string;
  outcome: "success" | "denied" | "failure";
  requestId: string;
}

export interface ContactLead {
  id: string;
  name: string;
  contact: string; // email or phone as entered by the visitor
  topic: "new_investor" | "portal_access" | "servicing" | "grievance" | "other";
  message: string;
  consentAt: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  lastSeenAt: number;
  revokedAt: number | null;
}

export interface PendingLogin {
  id: string;
  userId: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
}
