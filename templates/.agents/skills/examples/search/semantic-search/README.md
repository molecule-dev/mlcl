---
name: semantic-search
intent: |
  - "Semantic search"
  - "Search by meaning"
  - "Ask questions about my documents"
  - "Chat with your data / knowledge base"
  - "RAG / retrieval-augmented generation"
keywords:
  [semantic, search, rag, embeddings, vector, knowledge-base, ask-your-docs, retrieval, similarity]
---

# Semantic search + "ask your docs" (RAG over user content)

**When to copy this example:** the user wants search-by-meaning or a "chat with
your documents" / knowledge-base Q&A feature — index documents, then either
retrieve the most relevant passages (`/search`) or get a grounded, cited answer
(`/ask`). For plain keyword search, use the `search/full-text-search` example
instead. For a one-shot AI action (summarize/rewrite) with no retrieval, use
`integrations/ai-text-generation`.

## What you'll install

```bash
cd /workspace
# The RAG pipeline (chunk → embed → store → retrieve → grounded answer):
npm install @molecule/api-ai-rag-qa --workspace=api
# Embeddings core + OpenAI provider:
npm install @molecule/api-ai-embeddings @molecule/api-ai-embeddings-openai --workspace=api
# Vector store core + pgvector provider (reuses your Postgres):
npm install @molecule/api-ai-vector-store @molecule/api-ai-vector-store-pgvector --workspace=api
# The LLM that writes the grounded answer:
npm install @molecule/api-ai @molecule/api-ai-anthropic --workspace=api
# Throttle the metered embedding/LLM calls:
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api
```

## Files in this example

| Path                             | What it does                                                                                                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/handlers/knowledge.ts`      | `POST /documents` (chunk+embed+index), `POST /ask` (grounded RAG answer + sources), `POST /search` (semantic retrieval), `DELETE /documents/:id`. Every read is scoped to the caller's own chunks by a `user_id` metadata filter; the metered calls are rate-limited per user. |
| `app/components/AskYourDocs.tsx` | Question box that calls `POST /api/kb/ask` and renders the grounded answer plus the source excerpts. The model/vector store are never called from the browser.                                                                                                                 |

## Required env

```
OPENAI_API_KEY=...      # embeddings, server-side (@molecule/api-ai-embeddings-openai)
ANTHROPIC_API_KEY=...   # the grounded-answer LLM (@molecule/api-ai-anthropic)
DATABASE_URL=...        # pgvector reuses your Postgres (@molecule/api-ai-vector-store-pgvector)
```

## Bond wiring (api/bonds.ts or api/index.ts)

```typescript
import {
  setupAiAnthropic,
  setupAiEmbeddingsOpenai,
  setupAiVectorStorePgvector,
  setupRateLimitMemory,
} from '@molecule/api-bonds-default-express'
import { getProvider as getVectorStore } from '@molecule/api-ai-vector-store'

await setupAiEmbeddingsOpenai() // embeddings (OPENAI_API_KEY)
await setupAiVectorStorePgvector() // the vector store (DATABASE_URL / pgvector)
await setupAiAnthropic() // the grounded-answer LLM (ANTHROPIC_API_KEY)
await setupRateLimitMemory() // a rate-limit provider must be bonded for consume()

// Create the ONE shared collection once. createCollection is idempotent — a
// no-op when it already exists at the same dimension — so this is safe to run on
// every boot. 1536 = OpenAI text-embedding-3-small; MATCH your embeddings model's
// dimension (text-embedding-3-large is 3072), or retrieval returns garbage.
await getVectorStore()?.createCollection({ name: 'knowledge', dimension: 1536 })
```

Mount the handler under `/api/kb` so the routes are `/api/kb/documents`,
`/api/kb/ask`, `/api/kb/search`.

## Anti-patterns

- Do not build embeddings/vector search with a vendor SDK (`openai`, `pinecone`,
  `@pinecone-database/pinecone`) in a handler. Go through `@molecule/api-ai-rag-qa`
  - the bonds so the embeddings model, vector store, and LLM are all swappable.
    The registered packages are `@molecule/api-ai-embeddings`,
    `@molecule/api-ai-vector-store`, and `@molecule/api-ai-rag-qa` — do not invent
    names like `@molecule/api-rag` or `@molecule/api-embeddings`.
- Do not drop the per-user metadata filter on reads. ONE collection holds every
  tenant's chunks; `answerQuestion`/`retrieve` MUST be called with
  `filter: [{ field: 'user_id', operator: 'eq', value: userId }]` or one user's
  question retrieves — and gets an answer grounded in — another user's documents.
  Tag each chunk with the owner's `user_id` (server-set from the session, never
  the client) at index time.
- Do not create a collection per user. That becomes one Postgres table per user
  on pgvector. Use ONE collection + the `user_id` metadata filter for isolation.
- Do not mismatch the collection dimension and the embeddings model. The
  `createCollection({ dimension })` value must equal the model's output size
  (text-embedding-3-small → 1536, text-embedding-3-large → 3072). A mismatch
  fails the upsert (pgvector) or silently returns meaningless similarity scores.
- Do not call the model or vector store from the browser. Embedding + generation
  use secret keys and must run server-side; proxy through your API.
- Do not leave the metered endpoints unthrottled. Embedding and generation are
  billed per call — rate-limit per user with `consume()`. For a hard per-plan cap
  ("50 questions/month on free"), wrap the route in `enforceLimit` from
  `@molecule/api-entitlements`.
- Do not re-embed with a different model without re-indexing. Vectors are only
  comparable within one embeddings model + dimension; switching models means
  re-indexing the whole collection.

## Verify

Index a document via `POST /api/kb/documents { documentId, text }` → ask a
question about it in the UI → the grounded answer references the document and the
source excerpts appear below it. A question about a topic NOT in your documents
returns "I don't know based on the provided sources." A second user asking the
same question never sees the first user's documents.
