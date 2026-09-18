-- rag-knowledge-base: app-specific indexes for common query patterns.

CREATE INDEX IF NOT EXISTS collections_owner_idx
  ON collections (user_id, name);

CREATE INDEX IF NOT EXISTS sources_owner_idx
  ON sources (user_id, kind);

CREATE INDEX IF NOT EXISTS documents_owner_updated_idx
  ON documents (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS documents_collection_updated_idx
  ON documents (collection_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS documents_status_idx
  ON documents (ingest_status);

CREATE INDEX IF NOT EXISTS documents_body_fts_idx
  ON documents USING gin (to_tsvector('english', coalesce(body_md, '')));

CREATE INDEX IF NOT EXISTS qa_conversations_owner_last_idx
  ON qa_conversations (user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS qa_entries_owner_created_idx
  ON qa_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS qa_entries_conversation_idx
  ON qa_entries (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS qa_messages_conversation_idx
  ON qa_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS graph_edges_owner_idx
  ON graph_edges (user_id, from_doc_id);

CREATE INDEX IF NOT EXISTS org_members_owner_idx
  ON org_members (user_id);

CREATE INDEX IF NOT EXISTS org_members_member_idx
  ON org_members (member_user_id);

CREATE INDEX IF NOT EXISTS notifications_owner_read_idx
  ON notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS api_tokens_owner_idx
  ON api_tokens (user_id);
