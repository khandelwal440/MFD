import { randomUUID } from "node:crypto";
import type {
  AuditEvent,
  Consent,
  ContactLead,
  HoldingSnapshot,
  InvestorAccount,
  PendingLogin,
  Session,
  SipMandate,
  SupportCase,
  SyncJob,
  Transaction,
  User,
} from "./types";
import { seedUsers } from "./seed";

// In-memory stand-in for PostgreSQL (see schema.sql). Kept on globalThis so
// Next.js dev reloads don't wipe it. Data resets when the server restarts.
export interface Store {
  users: User[];
  investorAccounts: InvestorAccount[];
  consents: Consent[];
  holdings: HoldingSnapshot[];
  transactions: Transaction[];
  sipMandates: SipMandate[];
  syncJobs: SyncJob[];
  supportCases: SupportCase[];
  auditEvents: AuditEvent[];
  leads: ContactLead[];
  sessions: Session[];
  pendingLogins: PendingLogin[];
  // Assistant conversations are held server-side per session so the browser
  // can't forge earlier assistant turns or tool results.
  conversations: Map<string, unknown[]>;
}

const g = globalThis as unknown as { __mfpStore?: Store };

function createStore(): Store {
  const s: Store = {
    users: [],
    investorAccounts: [],
    consents: [],
    holdings: [],
    transactions: [],
    sipMandates: [],
    syncJobs: [],
    supportCases: [],
    auditEvents: [],
    leads: [],
    sessions: [],
    pendingLogins: [],
    conversations: new Map(),
  };
  seedUsers(s);
  return s;
}

export function db(): Store {
  if (!g.__mfpStore) g.__mfpStore = createStore();
  return g.__mfpStore;
}

export function resetStoreForTests(): Store {
  g.__mfpStore = createStore();
  return g.__mfpStore;
}

export const newId = () => randomUUID();
