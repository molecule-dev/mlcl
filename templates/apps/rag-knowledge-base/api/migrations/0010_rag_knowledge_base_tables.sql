-- rag-knowledge-base: app-specific tables. The base scaffold ships
-- migrations for users / devices / payments / usersSecrets only;
-- everything below is referenced from api/handlers/*.ts and must
-- exist before the api boots.

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  document_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  collection_id UUID,
  kind TEXT NOT NULL DEFAULT 'upload',
  label TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  doc_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  collection_id UUID,
  source_id UUID,
  title TEXT NOT NULL,
  slug TEXT,
  body_md TEXT,
  source_url TEXT,
  mime TEXT,
  size_bytes BIGINT,
  s3_key TEXT,
  ingest_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  page_count INTEGER,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS qa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  collection_id UUID,
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS qa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  collection_id UUID,
  question TEXT NOT NULL,
  answer_md TEXT NOT NULL DEFAULT '',
  citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5, 4) NOT NULL DEFAULT 0,
  model TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  response_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
ALTER TABLE qa_entries ADD COLUMN IF NOT EXISTS response_ms INTEGER;

CREATE TABLE IF NOT EXISTS qa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  entry_id UUID,
  role TEXT NOT NULL DEFAULT 'user',
  text TEXT NOT NULL DEFAULT '',
  citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_doc_id UUID NOT NULL,
  to_doc_id UUID NOT NULL,
  weight NUMERIC(5, 4) NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'similarity',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owner of the membership row (the inviter); IDOR scopes against this.
  user_id UUID NOT NULL,
  -- Reconciled user_id of the invitee once they sign up; null until claimed.
  member_user_id UUID,
  invitee_email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  hashed_token TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
