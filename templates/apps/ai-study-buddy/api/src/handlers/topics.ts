/**
 * Topic CRUD handlers (a "topic" = INVENTORY's "course"; the existing
 * vocabulary is preserved across pages and tests).
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { ChatEvent } from '@molecule/api-ai'
import {
  getProvider as getAIProvider,
  getProviderByName as getAIProviderByName,
} from '@molecule/api-ai'
import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { AiStudyBuddyLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxTopics = enforceLimit<AiStudyBuddyLimits>({
  limitType: 'maxTopics',
  getLimit: (limits) => limits.maxTopics,
  getCurrent: async (userId) =>
    count('topics', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const createTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(40).optional(),
})

const updateTopicSchema = createTopicSchema.partial()

const listQuerySchema = z.object({
  search: z.string().optional(),
  subject: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createMaterialSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(200_000),
  materialType: z.enum(['notes', 'pdf', 'url', 'image']).optional(),
})

const askSchema = z.object({
  question: z.string().min(1).max(4000),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { search, subject, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (subject) where.push({ field: 'subject', operator: '=', value: subject })
    if (search) where.push({ field: 'title', operator: 'ilike', value: search })
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const topics = await findMany('topics', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    res.json(topics)
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const topic = await findById<Record<string, unknown>>('topics', idOf(req))
    if (!topic || topic.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    res.json(topic)
  },
)

router.post(
  '/',
  enforceMaxTopics,
  validateBody(createTopicSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createTopicSchema>
    const result = await create('topics', {
      user_id: userId,
      title: body.title,
      description: body.description ?? '',
      subject: body.subject ?? 'general',
      color: body.color ?? 'teal',
      material_count: 0,
      mastery_score: 0,
      last_studied_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTopicSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('topics', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('topics', id, updates)
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTopicSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('topics', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('topics', id, updates)
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('topics', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    await deleteMany('study_materials', [
      { field: 'topic_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('study_sessions', [
      { field: 'topic_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('topics', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

router.get(
  '/:id/materials',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const topic = await findById<Record<string, unknown>>('topics', idOf(req))
    if (!topic || topic.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const materials = await findMany('study_materials', {
      where: [
        { field: 'topic_id', operator: '=', value: idOf(req) },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(materials)
  },
)

router.post(
  '/:id/materials',
  validateParams(idParamSchema),
  validateBody(createMaterialSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const topicId = idOf(req)
    const topic = await findById<Record<string, unknown>>('topics', topicId)
    if (!topic || topic.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createMaterialSchema>
    const result = await create('study_materials', {
      topic_id: topicId,
      user_id: userId,
      title: body.title,
      content: body.content,
      material_type: body.materialType ?? 'notes',
      embedding_status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    })
    await updateById('topics', topicId, {
      material_count: ((topic.material_count as number) ?? 0) + 1,
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.post(
  '/:id/ask',
  validateParams(idParamSchema),
  validateBody(askSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const topicId = idOf(req)
    const topic = await findById<Record<string, unknown>>('topics', topicId)
    if (!topic || topic.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const { question } = req.body as z.infer<typeof askSchema>

    const aiProvider = getAIProvider() ?? getAIProviderByName('anthropic')
    if (!aiProvider) {
      res.status(503).json({
        error: t('topics.aiUnavailable', undefined, {
          defaultValue: 'AI tutor is not configured. Set ANTHROPIC_API_KEY and restart.',
        }),
      })
      return
    }

    const materials = await findMany<{ title: string; content: string }>('study_materials', {
      where: [
        { field: 'topic_id', operator: '=', value: topicId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 6,
    })
    const context = materials
      .map((m) => `## ${m.title}\n${(m.content ?? '').slice(0, 2000)}`)
      .join('\n\n')
      .slice(0, 12_000)

    const systemPrompt = t(
      'topics.aiSystem',
      { topic: topic.title as string },
      {
        defaultValue:
          'You are a patient, Socratic tutor for the topic "{{topic}}". Give a concise, accurate answer. If the student asks a factual question, answer directly. If they ask conceptually, guide with a short question or analogy first, then give the answer. Keep responses under 200 words.',
      },
    )

    let answer = ''
    try {
      const messages = context
        ? [
            {
              role: 'user' as const,
              content: `Reference material for topic "${String(topic.title)}":\n\n${context}\n\nStudent question: ${question}`,
            },
          ]
        : [{ role: 'user' as const, content: question }]
      for await (const event of aiProvider.chat({
        messages,
        system: systemPrompt,
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 800,
      })) {
        const e = event as ChatEvent
        if (e.type === 'text') answer += String((e as { content?: string }).content ?? '')
        if (e.type === 'error') {
          throw new Error(String((e as { message?: string }).message ?? 'AI error'))
        }
        if (e.type === 'done') break
      }
    } catch (err) {
      console.error('topics.ask_failed', err)
      const message = err instanceof Error ? err.message : 'AI tutor failed.'
      res.status(502).json({ error: message })
      return
    }
    answer = answer.trim()
    if (!answer) {
      res.status(502).json({
        error: t('topics.aiEmpty', undefined, { defaultValue: 'AI tutor returned no answer.' }),
      })
      return
    }

    await create('study_sessions', {
      user_id: userId,
      topic_id: topicId,
      session_type: 'qa',
      question,
      answer,
      cards_reviewed: 0,
      ai_messages_count: 1,
      started_at: new Date(),
      created_at: new Date(),
    })

    await updateById('topics', topicId, {
      last_studied_at: new Date(),
      updated_at: new Date(),
    })

    res.json({ answer, citations: [] })
  },
)

export default router
