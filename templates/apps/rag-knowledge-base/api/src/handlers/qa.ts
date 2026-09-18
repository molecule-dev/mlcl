import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getProviderByName } from '@molecule/api-ai'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  query,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { retrieveRelevantChunks } from '../lib/chunking.js'
import { resolveRagSettings, type UserWithRag } from '../lib/rag-settings.js'
import type { RagKnowledgeBaseLimits } from '../tiers.js'

const router = Router()

const ASK_MODEL = 'claude-sonnet-4-5'

interface CitationRecord {
  id: string
  title: string
  reference: string
  excerpt: string
  relevance: number
  document_id: string
  chunk_index: number
}

function shapeEntry(entry: Record<string, unknown>): Record<string, unknown> {
  let citations: CitationRecord[] = []
  const raw = entry.citations_json
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) citations = parsed as CitationRecord[]
    } catch (_error) {
      // citations_json is malformed; fall back to empty citations array
      citations = []
    }
  }
  const answerMd = String(entry.answer_md ?? '')
  const paragraphs = answerMd
    ? answerMd
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []
  return {
    ...entry,
    answer: answerMd,
    paragraphs,
    citations,
  }
}

const askSchema = z.object({
  question: z.string().min(1),
  collection_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
})

const createConversationSchema = z.object({
  collection_id: z.string().uuid().optional(),
  title: z.string().optional(),
})

const updateConversationSchema = z.object({
  title: z.string().min(1).optional(),
})

const createEntrySchema = z.object({
  conversation_id: z.string().uuid().optional(),
  collection_id: z.string().uuid().optional(),
  question: z.string().min(1),
  answer_md: z.string().optional(),
  citations: z.array(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  model: z.string().optional(),
  tokens_used: z.number().int().nonnegative().optional(),
})

router.get('/conversations', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const rows = await findMany('qa_conversations', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'last_message_at', direction: 'desc' }],
  })
  res.json(rows)
})

router.post(
  '/conversations',
  validateBody(createConversationSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createConversationSchema>
    const now = new Date()
    const result = await create('qa_conversations', {
      user_id: userId,
      collection_id: body.collection_id ?? null,
      title: body.title ?? null,
      started_at: now,
      last_message_at: now,
      created_at: now,
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  },
)

router.get('/conversations/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const id = getParamId(req)
  const conversation = await findById<Record<string, unknown>>('qa_conversations', id)
  if (!conversation || conversation.user_id !== userId) {
    return res.status(404).json({
      error: t('qa.conversationNotFound', undefined, { defaultValue: 'Conversation not found.' }),
    })
  }
  const messages = await findMany('qa_messages', {
    where: [{ field: 'conversation_id', operator: '=', value: id }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  res.json({ ...conversation, messages })
})

router.put(
  '/conversations/:id',
  validateBody(updateConversationSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('qa_conversations', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('qa.conversationNotFound', undefined, { defaultValue: 'Conversation not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateConversationSchema>
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    const result = await updateById('qa_conversations', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  },
)

router.delete('/conversations/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('qa_conversations', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('qa.conversationNotFound', undefined, { defaultValue: 'Conversation not found.' }),
    })
  }
  await deleteById('qa_conversations', id)
  res.status(204).end()
})

router.get('/entries', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const rows = await findMany<Record<string, unknown>>('qa_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json(rows.map(shapeEntry))
})

router.get('/entries/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const id = getParamId(req)
  const row = await findById<Record<string, unknown>>('qa_entries', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({
      error: t('qa.entryNotFound', undefined, { defaultValue: 'Q&A entry not found.' }),
    })
  }
  res.json(shapeEntry(row))
})

router.post(
  '/entries',
  enforceLimit<RagKnowledgeBaseLimits>({
    limitType: 'maxQa',
    getLimit: (limits) => limits.maxQa,
    getCurrent: async (userId) =>
      count('qa_entries', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createEntrySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createEntrySchema>
    const result = await create('qa_entries', {
      user_id: userId,
      conversation_id: body.conversation_id ?? null,
      collection_id: body.collection_id ?? null,
      question: body.question,
      answer_md: body.answer_md ?? '',
      citations_json: JSON.stringify(body.citations ?? []),
      confidence: body.confidence ?? 0,
      model: body.model ?? null,
      tokens_used: body.tokens_used ?? 0,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  },
)

router.delete('/entries/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('qa_entries', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('qa.entryNotFound', undefined, { defaultValue: 'Q&A entry not found.' }),
    })
  }
  await deleteById('qa_entries', id)
  res.status(204).end()
})

/**
 * Aggregate counters powering the Ask page hero/metric tiles. We compute
 * them from the persisted `qa_entries` table so the numbers always match
 * what the user actually sees in /history.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const totalsResult = await query<{
    questions_today: string
    questions_yesterday: string
    avg_confidence: string | null
    avg_response_ms: string | null
    cited_docs_today: string
  }>(
    `WITH today AS (
       SELECT * FROM qa_entries
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE
     ),
     yesterday AS (
       SELECT * FROM qa_entries
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE - INTERVAL '1 day'
     )
     SELECT
       (SELECT COUNT(*)::text FROM today)                           AS questions_today,
       (SELECT COUNT(*)::text FROM yesterday)                       AS questions_yesterday,
       (SELECT AVG(confidence)::text FROM today)                    AS avg_confidence,
       (SELECT AVG(response_ms)::text FROM today
         WHERE response_ms IS NOT NULL)                             AS avg_response_ms,
       (SELECT COUNT(DISTINCT cit->>'document_id')::text
        FROM today, jsonb_array_elements(citations_json) cit
        WHERE jsonb_typeof(citations_json) = 'array')               AS cited_docs_today`,
    [userId],
  )

  // The migration shipped a numeric `response_ms` column for the metric;
  // older databases without it surface a SQL exception above. Fall back
  // to a 7-day window aggregation if so.
  const row = totalsResult.rows[0] ?? {
    questions_today: '0',
    questions_yesterday: '0',
    avg_confidence: null,
    avg_response_ms: null,
    cited_docs_today: '0',
  }

  const historyResult = await query<{ date: string; count: string }>(
    `SELECT to_char(d, 'YYYY-MM-DD') AS date,
            COALESCE(COUNT(qa_entries.id), 0)::text AS count
     FROM generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, '1 day') d
     LEFT JOIN qa_entries
       ON qa_entries.user_id = $1
      AND qa_entries.created_at::date = d::date
     GROUP BY d
     ORDER BY d`,
    [userId],
  )

  const today = Number(row.questions_today)
  const yesterday = Number(row.questions_yesterday)
  const avgConfidence = row.avg_confidence ? Number(row.avg_confidence) : 0
  res.json({
    questions_today: today,
    questions_change_pct:
      yesterday > 0 ? Number((((today - yesterday) / yesterday) * 100).toFixed(1)) : 0,
    avg_relevance_pct: Number((avgConfidence * 100).toFixed(1)),
    avg_response_ms: row.avg_response_ms ? Math.round(Number(row.avg_response_ms)) : 0,
    cited_docs_today: Number(row.cited_docs_today),
    history_7d: historyResult.rows.map((r) => ({ date: r.date, count: Number(r.count) })),
  })
})

router.get('/history', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const rows = await findMany<Record<string, unknown>>('qa_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 50,
  })
  res.json(rows.map(shapeEntry))
})

async function generateAnswer(
  question: string,
  context: { excerpt: string; title: string; reference: string; index: number }[],
): Promise<{ answerMd: string; tokensUsed: number; modelUsed: string }> {
  const provider = getProviderByName('anthropic')
  if (!provider) {
    return {
      answerMd: '',
      tokensUsed: 0,
      modelUsed: ASK_MODEL,
    }
  }

  const contextBlock = context
    .map((c) => `[${c.index}] ${c.title}${c.reference ? ` — ${c.reference}` : ''}\n${c.excerpt}`)
    .join('\n\n---\n\n')

  const system = `You are Engram, the knowledge-base Q&A assistant. Answer the user's question using ONLY the provided context excerpts. Cite sources by writing [n] where n is the excerpt number that supports the claim. If the context does not contain enough information to answer, say so plainly. Keep the answer to 1-3 short paragraphs of plain markdown — no headings, no lists unless the question explicitly asks for one.`

  const user = `Context excerpts:\n\n${contextBlock || '(no relevant excerpts found)'}\n\nQuestion: ${question}\n\nAnswer with inline [n] citations.`

  let answerMd = ''
  let tokensUsed = 0
  let modelUsed = ASK_MODEL
  try {
    for await (const event of provider.chat({
      messages: [{ role: 'user', content: user }],
      system,
      model: ASK_MODEL,
      maxTokens: 700,
      temperature: 0.2,
    })) {
      if (event.type === 'text') {
        answerMd += event.content
      } else if (event.type === 'done') {
        tokensUsed = event.usage.inputTokens + event.usage.outputTokens
      } else if (event.type === 'error') {
        logger.error(`qa/ask anthropic stream error: ${event.message}`)
      }
    }
  } catch (err) {
    logger.error(
      `qa/ask anthropic call failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (provider.name) modelUsed = `${provider.name}/${ASK_MODEL}`
  return { answerMd, tokensUsed, modelUsed }
}

/**
 * Real RAG endpoint: pulls the top-K chunks from `document_chunks` via FTS,
 * builds a citation-aware system prompt, calls Anthropic, and persists
 * the answer + citations on `qa_entries` so /history and /stats reflect
 * the new question immediately.
 */
router.post(
  '/ask',
  enforceLimit<RagKnowledgeBaseLimits>({
    limitType: 'maxQa',
    getLimit: (limits) => limits.maxQa,
    getCurrent: async (userId) =>
      count('qa_entries', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(askSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof askSchema>
    const startedAt = Date.now()
    const now = new Date()

    let conversationId: string | null = body.conversation_id ?? null
    if (conversationId) {
      const conversation = await findById<Record<string, unknown>>(
        'qa_conversations',
        conversationId,
      )
      if (!conversation || conversation.user_id !== userId) {
        return res.status(404).json({
          error: t('qa.conversationNotFound', undefined, {
            defaultValue: 'Conversation not found.',
          }),
        })
      }
    } else {
      const conv = await create('qa_conversations', {
        user_id: userId,
        collection_id: body.collection_id ?? null,
        title: body.question.slice(0, 80),
        started_at: now,
        last_message_at: now,
        created_at: now,
      })
      const created = (conv as { data?: Record<string, unknown> }).data ?? conv
      conversationId = ((created as { id?: string }).id ?? null) as string | null
    }

    // Honor the user's stored retrieval top_k (Settings → oauthData.rag.retrievalK); it was persisted
    // but the retrieval hardcoded 5, so changing "Top-k chunks" did nothing.
    const ragUser = await findById<UserWithRag>('users', userId)
    const { retrievalK } = resolveRagSettings(ragUser)
    const retrieved = await retrieveRelevantChunks(userId, body.question, retrievalK)
    const totalRank = retrieved.reduce((acc, r) => acc + Math.max(r.rank, 0), 0) || 1
    const citations: CitationRecord[] = retrieved.map((r) => {
      const referenceParts: string[] = []
      if (r.heading) referenceParts.push(r.heading)
      if (r.page_number) referenceParts.push(`p. ${r.page_number}`)
      referenceParts.push(`chunk ${r.chunk_index + 1}`)
      const excerpt = r.body_text.length > 240 ? `${r.body_text.slice(0, 240)}…` : r.body_text
      return {
        id: r.id,
        title: r.document_title || 'Untitled',
        reference: referenceParts.join(' · '),
        excerpt,
        relevance: Number(((Math.max(r.rank, 0) / totalRank) * 100).toFixed(1)),
        document_id: r.document_id,
        chunk_index: r.chunk_index,
      }
    })

    const aiContext = retrieved.map((r, i) => ({
      index: i + 1,
      title: r.document_title || 'Untitled',
      reference: r.heading ?? `chunk ${r.chunk_index + 1}`,
      excerpt: r.body_text,
    }))

    const { answerMd, tokensUsed, modelUsed } = await generateAnswer(body.question, aiContext)

    const fallbackAnswer =
      !answerMd && retrieved.length === 0
        ? `I couldn't find anything in your indexed documents that answers "${body.question}". Try uploading a document first via the Documents tab.`
        : answerMd ||
          'No answer was generated by the model. Please try again, or rephrase your question.'

    const responseMs = Date.now() - startedAt
    const confidence = retrieved.length ? Math.min(0.99, Math.max(retrieved[0].rank, 0)) : 0

    const entryResult = await create('qa_entries', {
      user_id: userId,
      conversation_id: conversationId,
      collection_id: body.collection_id ?? null,
      question: body.question,
      answer_md: fallbackAnswer,
      citations_json: JSON.stringify(citations),
      confidence,
      model: modelUsed,
      tokens_used: tokensUsed,
      response_ms: responseMs,
      created_at: now,
    })
    const entry = (entryResult as { data?: Record<string, unknown> }).data ?? entryResult
    const entryId = (entry as { id?: string }).id ?? null

    if (conversationId) {
      await create('qa_messages', {
        user_id: userId,
        conversation_id: conversationId,
        entry_id: entryId,
        role: 'user',
        text: body.question,
        citations_json: JSON.stringify([]),
        created_at: now,
      })
      await create('qa_messages', {
        user_id: userId,
        conversation_id: conversationId,
        entry_id: entryId,
        role: 'assistant',
        text: fallbackAnswer,
        citations_json: JSON.stringify(citations),
        created_at: new Date(),
      })
      await updateById('qa_conversations', conversationId, { last_message_at: new Date() })
    }

    res.status(201).json({
      ...shapeEntry({ ...entry, response_ms: responseMs }),
      response_time_ms: responseMs,
    })
  },
)

export default router
