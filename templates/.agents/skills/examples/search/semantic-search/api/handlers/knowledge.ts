import { Router } from 'express'
import { z } from 'zod'

import { answerQuestion, deleteDocument, indexDocument, retrieve } from '@molecule/api-ai-rag-qa'
import type { MetadataFilter } from '@molecule/api-ai-vector-store'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import { consume } from '@molecule/api-rate-limit'

const logger = getLogger()

/**
 * Semantic search + grounded "ask your docs" (RAG) over user-uploaded content.
 *
 * `@molecule/api-ai-rag-qa` composes three bonds — embeddings, a vector store,
 * and the AI provider — so this handler never touches a vendor SDK: swapping
 * OpenAI embeddings, pgvector, or Anthropic is a bond change, not a code change.
 *
 * ONE shared vector collection holds every tenant's chunks; each chunk is tagged
 * with its owner's `user_id` in metadata and EVERY read is filtered by it, so a
 * user can only ever retrieve their OWN documents. This is the multi-tenant
 * isolation model — do NOT create a collection per user (that explodes into one
 * DB table per user on pgvector) and do NOT drop the owner filter (that leaks
 * every tenant's documents into each other's answers).
 */

const COLLECTION = 'knowledge'

/**
 * IDOR guard: scope every retrieval to the caller's own chunks. Indexing tags
 * each chunk with `user_id` (server-set from the session, never the client);
 * this filter guarantees `answerQuestion`/`retrieve` never see another tenant's
 * chunks. Never omit it on a read.
 */
const ownerFilter = (userId: string): MetadataFilter[] => [
  { field: 'user_id', operator: 'eq', value: userId },
]

const indexSchema = z.object({
  documentId: z.string().min(1).max(200),
  text: z.string().min(1).max(100_000),
  title: z.string().max(300).optional(),
})
const askSchema = z.object({ question: z.string().min(1).max(2000) })
const searchSchema = z.object({ query: z.string().min(1).max(2000) })

const router = Router()

// Embedding and generation are METERED, slow calls — throttle per user before
// dispatching so a runaway loop can't run up the bill or starve everyone.
async function throttle(userId: string, action: string): Promise<{ retryAfter?: number } | null> {
  const rl = await consume(`kb-${action}:${userId}`)
  return rl.allowed ? null : { retryAfter: rl.retryAfter }
}

router.post('/documents', async (req, res) => {
  const userId = res.locals?.session?.userId
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('kb.unauthorized', undefined, { defaultValue: 'You must be logged in.' }) })
  }
  const parsed = indexSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('kb.invalidDocument', undefined, {
        defaultValue: 'documentId and text are required.',
      }),
    })
  }
  const limited = await throttle(userId, 'index')
  if (limited) {
    return res.status(429).json({
      error: t('kb.rateLimited', undefined, {
        defaultValue: 'Too many requests — try again shortly.',
      }),
      retryAfter: limited.retryAfter,
    })
  }
  try {
    const documentId = `${userId}:${parsed.data.documentId}`
    // A re-index of the SAME documentId must REPLACE the document, not merge
    // with it. `indexDocument` upserts chunks under deterministic ids
    // (`${documentId}::<i>`, see @molecule/api-ai-rag-qa), so indexing a SHORTER
    // text left every chunk past the new end behind with the OLD content: /ask
    // and /search (both scoped by the owner filter, both reading the shared
    // collection) kept returning text the user had removed, and each shrinking
    // re-index added more of it. Clearing the document first makes the index
    // hold exactly what was just submitted. It also means an index that fails
    // AFTER the clear leaves the document unindexed rather than half-replaced —
    // the 502 below is the retry, and a retry re-submits the whole text.
    await deleteDocument({ collection: COLLECTION, documentId })
    const chunkIds = await indexDocument({
      collection: COLLECTION,
      // Namespace the id by owner so one tenant's document ids can never collide
      // with — or address — another tenant's chunks.
      documentId,
      text: parsed.data.text,
      metadata: { user_id: userId, title: parsed.data.title ?? '' },
    })
    return res.json({ chunks: chunkIds.length })
  } catch (error) {
    logger.error('kb index failed', { error })
    return res.status(502).json({
      error: t('kb.failed', undefined, { defaultValue: 'Indexing failed. Please try again.' }),
    })
  }
})

router.post('/ask', async (req, res) => {
  const userId = res.locals?.session?.userId
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('kb.unauthorized', undefined, { defaultValue: 'You must be logged in.' }) })
  }
  const parsed = askSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('kb.invalidQuestion', undefined, { defaultValue: 'A question is required.' }),
    })
  }
  const limited = await throttle(userId, 'ask')
  if (limited) {
    return res.status(429).json({
      error: t('kb.rateLimited', undefined, {
        defaultValue: 'Too many requests — try again shortly.',
      }),
      retryAfter: limited.retryAfter,
    })
  }
  try {
    const { answer, sources } = await answerQuestion({
      collection: COLLECTION,
      question: parsed.data.question,
      filter: ownerFilter(userId),
    })
    return res.json({
      answer,
      sources: sources.map((s) => ({
        text: s.text,
        score: s.score,
        title: (s.metadata?.title as string | undefined) ?? '',
      })),
    })
  } catch (error) {
    logger.error('kb ask failed', { error })
    return res.status(502).json({
      error: t('kb.failed', undefined, {
        defaultValue: 'The AI request failed. Please try again.',
      }),
    })
  }
})

router.post('/search', async (req, res) => {
  const userId = res.locals?.session?.userId
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('kb.unauthorized', undefined, { defaultValue: 'You must be logged in.' }) })
  }
  const parsed = searchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('kb.invalidQuery', undefined, { defaultValue: 'A query is required.' }) })
  }
  const limited = await throttle(userId, 'search')
  if (limited) {
    return res.status(429).json({
      error: t('kb.rateLimited', undefined, {
        defaultValue: 'Too many requests — try again shortly.',
      }),
      retryAfter: limited.retryAfter,
    })
  }
  try {
    const hits = await retrieve({
      collection: COLLECTION,
      query: parsed.data.query,
      filter: ownerFilter(userId),
      topK: 5,
    })
    return res.json({
      hits: hits.map((h) => ({
        text: h.text,
        score: h.score,
        title: (h.metadata?.title as string | undefined) ?? '',
      })),
    })
  } catch (error) {
    logger.error('kb search failed', { error })
    return res.status(502).json({
      error: t('kb.failed', undefined, { defaultValue: 'Search failed. Please try again.' }),
    })
  }
})

router.delete('/documents/:id', async (req, res) => {
  const userId = res.locals?.session?.userId
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('kb.unauthorized', undefined, { defaultValue: 'You must be logged in.' }) })
  }
  try {
    // The owner prefix is server-set, so a caller can only ever delete the chunks
    // of a document they own — deleting another tenant's is unaddressable here.
    await deleteDocument({ collection: COLLECTION, documentId: `${userId}:${req.params.id}` })
    return res.status(204).end()
  } catch (error) {
    logger.error('kb delete failed', { error })
    return res.status(502).json({
      error: t('kb.failed', undefined, { defaultValue: 'Delete failed. Please try again.' }),
    })
  }
})

export default router
