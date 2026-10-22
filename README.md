# Mutual Fund Distributor Portal

The MVP from the *Mutual Fund Distributor Website — Technical Architecture & Implementation Blueprint*: a public website, two-step investor login, a read-only portfolio dashboard, an AI assistant that can only use allowlisted read tools, and an admin health screen.

> **No provider API access is assumed.** All portfolio data comes from a deterministic **sample provider** (`lib/providers/mock.ts`). The KFintech, CAMS/MF Central, NSE and BSE adapters are placeholders that return `NOT_APPROVED` until each provider grants official API access. Don't scrape distributor portals or automate their logins.

## Run it

```bash
npm install
cp .env.example .env.local   # optional; sensible dev defaults apply
npm run dev                  # http://localhost:3000
```

```bash
npm test          # calculations, account isolation, AI tool guardrails, sync retries/idempotency
npm run typecheck
npm run build
```

### Demo logins (development only)

| Role | Email | Password |
| --- | --- | --- |
| Investor | `priya@example.test` | `Investor@123` |
| Investor | `rahul@example.test` | `Investor@123` |
| Admin | `admin@example.test` | `Admin@123` |

After the password step you need a 6-digit code. In development it's shown on the login screen and printed in the server console. In production it isn't returned. Wire `startLogin` in `lib/auth/session.ts` to an SMS/email provider.

### AI assistant

- Set `ANTHROPIC_API_KEY` in `.env.local` to use Claude (`claude-opus-5-5` by default, override with `AI_MODEL`). The server runs the tool-calling loop, with server-side refusal fallback enabled.
- With no key set, a rule-based **offline assistant** answers through the same tools and permission checks.

## What's where

| Blueprint section | Implementation |
| --- | --- |
| Public website (§1) | `app/(public)/*`: home, services, how it works, about, FAQs, contact (enquiry form), disclosures, privacy/consent |
| Auth (§4, §7) | `lib/auth/*`: scrypt passwords, OTP step, HMAC-signed HttpOnly/SameSite cookie, 30-min idle expiry, revocation on logout, rate limits |
| Account ownership (§2, §7) | `lib/services/portfolio.ts`: every query starts from the session user's verified accounts plus consent. No endpoint or tool accepts an account/investor id |
| Data model (§5) | `lib/db/types.ts`, `lib/db/schema.sql` (PostgreSQL DDL); `lib/db/store.ts` is an in-memory stand-in |
| Calculation rules (§5) | `lib/services/calculations.ts`: provider value or units × NAV, net invested, gain/loss, XIRR (bisection) |
| Provider adapters (§8) | `lib/providers/*`: `MutualFundProvider` interface, internal error codes, registry |
| Sync worker (§4, §8) | `lib/sync/worker.ts`: bounded exponential backoff with jitter (transient errors only), idempotent upserts keyed on provider refs, folio masking, stale-while-revalidate |
| Freshness (§2) | Every portal screen shows `fresh` / `stale` / `unavailable` with the as-of time and source |
| AI tools (§6) | `lib/ai/tools.ts`: six strict, read-only tools. Support requests are drafts that the investor must confirm in the UI |
| AI orchestration (§6) | `lib/ai/orchestrator.ts`: server-held conversation (the browser can't forge history), tool results validated and minimised, safe failure messages |
| Internal API (§8) | `app/api/*`: `/me`, `/portfolio/summary`, `/portfolio/holdings`, `/transactions`, `/sips`, `/support-cases`, `/sync-status`, `/chat` |
| Admin (§9 MVP) | `/admin`: provider status, per-account sync health, sync jobs, simulated outages, support cases, enquiries, audit trail |
| Audit (§7) | `lib/audit.ts`: action/outcome/request id only; no tokens, PAN or message content |

## Before going live

1. **Database**: replace `lib/db/store.ts` with PostgreSQL repositories using `schema.sql` (the in-memory store resets on restart and only works on a single instance). Move rate limiting to Redis or similar.
2. **Worker**: run `syncAll()` from a separate scheduled process or queue consumer instead of on page reads.
3. **Provider**: implement one approved adapter (start with the consolidated-data path from provider discovery) against official UAT, then reconcile figures against provider statements.
4. **OTP delivery and account linking**: real SMS/email OTP, and a verified folio-to-login linking flow with recorded consent.
5. **Secrets**: set `SESSION_SECRET`, keep provider credentials in a secret manager, and use separate dev/UAT/prod environments.
6. **Content**: replace the placeholder ARN, contact details and legal text, and have disclosures/privacy reviewed by a qualified Indian compliance professional.
7. **AI privacy**: confirm the AI provider's retention and region terms before sending real investor data.
8. Work through the blueprint's launch checklist (§12). Keep transactions disabled until they are separately approved and tested.
