-- ai-customer-service-bot: app-specific tables. The base scaffold ships
-- migrations for users / devices / threads / payments only; everything
-- below is referenced from api/handlers/*.ts and must exist before the
-- api boots. Slot 0010 is reserved by CLAUDE.md for canonical app tables.

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  end_user_id TEXT,
  customer_name TEXT NOT NULL DEFAULT 'Anonymous',
  customer_email TEXT,
  channel TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'open',
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  sentiment_score NUMERIC(20, 4),
  csat INTEGER,
  satisfaction_score INTEGER,
  message_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender TEXT NOT NULL DEFAULT 'customer',
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  intent_id UUID,
  model_used TEXT,
  citations_json JSONB,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT NOT NULL DEFAULT '',
  body_md TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  embedding_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_assigned_id UUID,
  accepted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  message_id UUID,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  metadata_json JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  bot_tone TEXT NOT NULL DEFAULT 'warm',
  auto_escalate BOOLEAN NOT NULL DEFAULT TRUE,
  greeting TEXT NOT NULL DEFAULT '',
  signature TEXT NOT NULL DEFAULT '',
  notify_escalations BOOLEAN NOT NULL DEFAULT TRUE,
  notify_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  notify_digest BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  label TEXT NOT NULL,
  hashed_token TEXT NOT NULL,
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);
