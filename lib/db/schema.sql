-- PostgreSQL schema for production. The demo build uses an in-memory store
-- (lib/db/store.ts) with the same shape; swap the repository functions for SQL
-- queries against these tables when moving to a managed PostgreSQL instance.

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_subject  text NOT NULL UNIQUE,
  display_name   text NOT NULL,
  role           text NOT NULL CHECK (role IN ('investor', 'admin')),
  password_hash  text NOT NULL,
  status         text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE investor_accounts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id),
  provider               text NOT NULL,
  provider_investor_ref  text NOT NULL,
  verified_at            timestamptz,
  status                 text NOT NULL,
  UNIQUE (provider, provider_investor_ref)
);

CREATE TABLE consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id),
  purpose         text NOT NULL,
  scope           text NOT NULL,
  policy_version  text NOT NULL,
  granted_at      timestamptz NOT NULL,
  withdrawn_at    timestamptz
);

CREATE TABLE holdings_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES investor_accounts(id),
  scheme_ref   text NOT NULL,
  scheme_name  text NOT NULL,
  category     text NOT NULL,
  folio_ref    text NOT NULL, -- tokenised reference, never the raw folio number
  units        numeric(20, 4) NOT NULL,
  nav          numeric(20, 4) NOT NULL,
  nav_date     date NOT NULL,
  value        numeric(20, 2) NOT NULL,
  as_of        timestamptz NOT NULL,
  source_ref   text NOT NULL,
  UNIQUE (account_id, folio_ref, scheme_ref)
);

CREATE TABLE transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES investor_accounts(id),
  provider_txn_ref  text NOT NULL,
  scheme_ref        text NOT NULL,
  scheme_name       text NOT NULL,
  type              text NOT NULL,
  amount            numeric(20, 2) NOT NULL,
  units             numeric(20, 4) NOT NULL,
  nav               numeric(20, 4) NOT NULL,
  status            text NOT NULL,
  transaction_date  date NOT NULL,
  updated_at        timestamptz NOT NULL,
  UNIQUE (account_id, provider_txn_ref) -- idempotent sync / dedupe
);

CREATE TABLE sip_mandates (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               uuid NOT NULL REFERENCES investor_accounts(id),
  provider_mandate_ref     text NOT NULL,
  scheme_ref               text NOT NULL,
  scheme_name              text NOT NULL,
  amount                   numeric(20, 2) NOT NULL,
  frequency                text NOT NULL,
  next_due_date            date,
  status                   text NOT NULL,
  last_installment_status  text,
  UNIQUE (account_id, provider_mandate_ref)
);

CREATE TABLE sync_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  account_id    uuid REFERENCES investor_accounts(id),
  job_type      text NOT NULL,
  started_at    timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text NOT NULL,
  error_code    text,
  record_count  integer NOT NULL DEFAULT 0,
  attempts      integer NOT NULL DEFAULT 0
);

CREATE TABLE support_cases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference    text NOT NULL UNIQUE,
  user_id      uuid NOT NULL REFERENCES users(id),
  category     text NOT NULL,
  description  text NOT NULL,
  status       text NOT NULL,
  assigned_to  text,
  source       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type   text NOT NULL,
  actor_id     uuid,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  timestamp    timestamptz NOT NULL DEFAULT now(),
  outcome      text NOT NULL,
  request_id   text NOT NULL
);

CREATE INDEX ON holdings_snapshots (account_id);
CREATE INDEX ON transactions (account_id, transaction_date DESC);
CREATE INDEX ON audit_events (actor_id, timestamp DESC);
