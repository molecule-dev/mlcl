-- ai-customer-service-bot: query-path indexes. Kept in their own slot so
-- index strategy can evolve without disturbing the canonical table
-- migration (0010) or the pgvector setup (0011).

CREATE INDEX IF NOT EXISTS conversations_owner_status_lastmsg_idx
  ON conversations (owner_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_owner_id_idx
  ON conversations (owner_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx
  ON conversations (status);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON messages (created_at);

CREATE INDEX IF NOT EXISTS knowledge_articles_owner_id_idx
  ON knowledge_articles (owner_id);
CREATE INDEX IF NOT EXISTS knowledge_articles_status_idx
  ON knowledge_articles (status);
CREATE INDEX IF NOT EXISTS knowledge_articles_category_idx
  ON knowledge_articles (category);

-- article_chunk_embeddings is created lazily by the pgvector bond at runtime
-- (per-collection table). The bond owns the embedding-index strategy (HNSW),
-- so this migration intentionally skips an article-id btree.

CREATE INDEX IF NOT EXISTS escalations_owner_id_idx
  ON escalations (owner_id);
CREATE INDEX IF NOT EXISTS escalations_conversation_id_idx
  ON escalations (conversation_id);

CREATE INDEX IF NOT EXISTS feedback_owner_id_idx
  ON feedback (owner_id);
CREATE INDEX IF NOT EXISTS feedback_conversation_id_idx
  ON feedback (conversation_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx
  ON notifications (user_id, read_at);

CREATE INDEX IF NOT EXISTS api_tokens_owner_id_idx
  ON api_tokens (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS api_tokens_hashed_token_idx
  ON api_tokens (hashed_token);
