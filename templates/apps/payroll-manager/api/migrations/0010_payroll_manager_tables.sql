-- payroll-manager: app-specific tables. The base scaffold ships migrations
-- for users / devices / payments only; everything below is referenced from
-- api/handlers/*.ts and must exist before the api boots.
--
-- v1 scope: a single owner (user) operates one company. All entities scope
-- by user_id (the owner) — the company is implicit in the owner's account.
-- Multi-user companies (HR/finance staff) are deferred to v2 alongside ACH
-- payroll disbursement; see INVENTORY.md "Open questions / decisions
-- deferred" for context.

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  department TEXT,
  salary NUMERIC(20, 4) NOT NULL DEFAULT 0,
  pay_frequency TEXT NOT NULL DEFAULT 'biweekly',
  tax_filing_status TEXT NOT NULL DEFAULT 'single',
  ssn_encrypted TEXT,
  start_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees (user_id);
CREATE INDEX IF NOT EXISTS employees_user_id_status_idx ON employees (user_id, status);

CREATE TABLE IF NOT EXISTS pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pay_period_start TIMESTAMPTZ NOT NULL,
  pay_period_end TIMESTAMPTZ NOT NULL,
  pay_date TIMESTAMPTZ NOT NULL,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_gross NUMERIC(20, 4) NOT NULL DEFAULT 0,
  total_taxes NUMERIC(20, 4) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(20, 4) NOT NULL DEFAULT 0,
  total_net NUMERIC(20, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pay_runs_user_id_idx ON pay_runs (user_id);
CREATE INDEX IF NOT EXISTS pay_runs_user_id_pay_date_idx ON pay_runs (user_id, pay_date);

CREATE TABLE IF NOT EXISTS pay_stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pay_run_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  gross NUMERIC(20, 4) NOT NULL DEFAULT 0,
  federal_tax NUMERIC(20, 4) NOT NULL DEFAULT 0,
  state_tax NUMERIC(20, 4) NOT NULL DEFAULT 0,
  fica NUMERIC(20, 4) NOT NULL DEFAULT 0,
  medicare NUMERIC(20, 4) NOT NULL DEFAULT 0,
  deductions_total NUMERIC(20, 4) NOT NULL DEFAULT 0,
  net NUMERIC(20, 4) NOT NULL DEFAULT 0,
  hours NUMERIC(10, 2),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pay_stubs_pay_run_id_idx ON pay_stubs (pay_run_id);
CREATE INDEX IF NOT EXISTS pay_stubs_user_id_idx ON pay_stubs (user_id);
CREATE INDEX IF NOT EXISTS pay_stubs_employee_id_idx ON pay_stubs (employee_id);

CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC(20, 4) NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
  is_pretax BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS deductions_user_id_idx ON deductions (user_id);
CREATE INDEX IF NOT EXISTS deductions_employee_id_active_idx ON deductions (employee_id, is_active);

CREATE TABLE IF NOT EXISTS tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  filing_status TEXT NOT NULL,
  min_income NUMERIC(20, 4) NOT NULL DEFAULT 0,
  max_income NUMERIC(20, 4),
  rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tax_brackets_year_status_idx ON tax_brackets (year, filing_status);

CREATE TABLE IF NOT EXISTS tax_withholdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  federal_allowances INTEGER NOT NULL DEFAULT 0,
  state_allowances INTEGER NOT NULL DEFAULT 0,
  additional_withholding NUMERIC(20, 4) NOT NULL DEFAULT 0,
  exempt BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS tax_withholdings_employee_id_idx ON tax_withholdings (employee_id);
CREATE INDEX IF NOT EXISTS tax_withholdings_user_id_idx ON tax_withholdings (user_id);

-- Audit log: written by every employees / pay_runs / deductions mutation
-- via @molecule/api-audit's `log()` call. Read by /audit-log GET so the
-- AuditLog page surfaces real activity rather than a hard-coded mock.
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_log_timestamp_idx ON audit_log (timestamp DESC);

-- Payments: required by @molecule/api-resource-payment (Stripe webhook
-- handler logs payment-notification rows here; required for the cancel /
-- delete-account flows even if no real charge has happened).
CREATE TABLE IF NOT EXISTS "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  "userId" UUID NOT NULL,
  "transactionId" TEXT,
  "productId" TEXT,
  "platformKey" TEXT,
  "data" JSONB,
  "receipt" TEXT
);
CREATE INDEX IF NOT EXISTS "payments_userId_index" ON "payments" ("userId");
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON "payments" ("transactionId");

-- Notifications: user-scoped activity feed (pay-run approvals, tax deadlines,
-- integration alerts, mentions). The Notifications page reads this and the
-- pay-run/process handler writes one when stubs are generated.
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'pay_run',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT,
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id, created_at DESC);

-- Company settings: keyed per user (the implicit company). One row per owner
-- holds the legal-name / EIN / address / pay-schedule fields surfaced on the
-- Settings page. Strict scope: every read filters by user_id.
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  legal_name TEXT NOT NULL DEFAULT '',
  ein TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  fiscal_year TEXT NOT NULL DEFAULT 'January – December',
  cadence TEXT NOT NULL DEFAULT 'biweekly',
  cycle_end_day TEXT NOT NULL DEFAULT 'Friday',
  pay_date_offset INTEGER NOT NULL DEFAULT 3,
  holiday_behavior TEXT NOT NULL DEFAULT 'Pay one business day early',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS company_settings_user_id_idx ON company_settings (user_id);

-- Seed the IRS 2025 federal income-tax brackets (single filer + married
-- filing jointly). Refresh annually. Bracket lookup: WHERE year = ? AND
-- filing_status = ? AND min_income <= income AND (max_income IS NULL OR
-- income < max_income).
INSERT INTO tax_brackets (year, filing_status, min_income, max_income, rate) VALUES
  (2025, 'single',           0,       11925,    0.10),
  (2025, 'single',       11925,       48475,    0.12),
  (2025, 'single',       48475,      103350,    0.22),
  (2025, 'single',      103350,      197300,    0.24),
  (2025, 'single',      197300,      250525,    0.32),
  (2025, 'single',      250525,      626350,    0.35),
  (2025, 'single',      626350,        NULL,    0.37),
  (2025, 'married',          0,       23850,    0.10),
  (2025, 'married',      23850,       96950,    0.12),
  (2025, 'married',      96950,      206700,    0.22),
  (2025, 'married',     206700,      394600,    0.24),
  (2025, 'married',     394600,      501050,    0.32),
  (2025, 'married',     501050,      751600,    0.35),
  (2025, 'married',     751600,        NULL,    0.37)
ON CONFLICT DO NOTHING;
