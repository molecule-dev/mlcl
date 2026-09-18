import { Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { answerQuestion, deleteDocument, indexDocument, retrieve } from '@molecule/api-ai-rag-qa'
import type { MetadataFilter } from '@molecule/api-ai-vector-store'
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
    const chunkIds = await indexDocument({
      collection: COLLECTION,
      // Namespace the id by owner so one tenant's document ids can never collide
      // with — or address — another tenant's chunks.
      documentId: `${userId}:${parsed.data.documentId}`,
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
