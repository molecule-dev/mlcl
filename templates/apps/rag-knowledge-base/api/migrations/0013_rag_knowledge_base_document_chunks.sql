-- rag-knowledge-base: chunked document storage for FTS-based retrieval.
--
-- We split each uploaded document into ~paragraph-sized chunks so the
-- retriever can return precise excerpts (not the entire document) when
-- generating cited answers. The body_text column carries plain text
-- (post-stripping of any markdown / HTML), and a generated tsvector
-- column powers PostgreSQL full-text search via a GIN index.
--
-- pgvector is unavailable in this environment, so we use FTS as the
-- retrieval primitive. When pgvector becomes available, an embedding
-- column can be added without breaking this schema.

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  body_text TEXT NOT NULL,
  page_number INTEGER,
  heading TEXT,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS document_chunks_document_idx
  ON document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS document_chunks_owner_idx
  ON document_chunks (user_id);

CREATE INDEX IF NOT EXISTS document_chunks_body_fts_idx
  ON document_chunks USING gin (to_tsvector('english', body_text));
