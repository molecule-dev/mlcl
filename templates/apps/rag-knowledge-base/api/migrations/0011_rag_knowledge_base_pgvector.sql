-- rag-knowledge-base: pgvector extension for the RAG retriever
-- (`@molecule/api-ai-rag` + `@molecule/api-ai-vector-store-pgvector`).
--
-- The pgvector bond creates per-collection vector tables lazily at runtime
-- (see `@molecule/api-ai-vector-store-pgvector` provider.ts), so this
-- migration only needs to ensure the extension is installed. We wrap the
-- CREATE EXTENSION in a DO/EXCEPTION so dev environments without
-- pgvector still apply migrations cleanly — the pgvector bond will
-- raise a clearer error at first use if the extension is truly missing.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN feature_not_supported OR undefined_file OR insufficient_privilege THEN
    RAISE NOTICE 'pgvector extension not available — vector store features will be unavailable until the extension is installed';
END
$$;
