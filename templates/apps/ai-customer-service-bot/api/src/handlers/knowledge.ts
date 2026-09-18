import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { AiCustomerServiceBotLimits } from '../tiers.js'

const router = Router()

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100_000).optional().default(''),
  body_md: z.string().max(100_000).optional().default(''),
  category: z.string().max(100).optional().default('general'),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
})

const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(100_000).optional(),
  body_md: z.string().max(100_000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

router.use(authorizers.auth())

// List knowledge articles — owner-scoped.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, category, q, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (category) where.push({ field: 'category', operator: '=', value: String(category) })
    if (q) where.push({ field: 'title', operator: 'ilike', value: String(q) })

    const articles = await findMany('knowledge_articles', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(articles)
  } catch (error) {
    logger.error('knowledge.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get article details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('knowledge_articles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('knowledge.notFound', {}, { defaultValue: 'Article not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('knowledge.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create article — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<AiCustomerServiceBotLimits>({
    limitType: 'maxKnowledge',
    getLimit: (limits) => limits.maxKnowledge,
    getCurrent: async (userId) =>
      count('knowledge_articles', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createArticleSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const { title, content, body_md, category, tags, status } = req.body as {
        title: string
        content: string
        body_md: string
        category: string
        tags: string[]
        status: 'draft' | 'published' | 'archived'
      }

      if (!title || (!content && !body_md)) {
        res.status(400).json({
          error: t(
            'knowledge.titleContentRequired',
            {},
            { defaultValue: 'Title and content are required' },
          ),
        })
        return
      }

      const now = new Date().toISOString()
      const result = await create('knowledge_articles', {
        owner_id: userId,
        title,
        content: content ?? body_md ?? '',
        body_md: body_md ?? content ?? '',
        category,
        tags_json: tags,
        status,
        embedding_status: 'pending',
        version: 1,
        created_at: now,
        updated_at: now,
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('knowledge.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update article — owner-only.
router.put('/:id', validateBody(updateArticleSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('knowledge_articles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('knowledge.notFound', {}, { defaultValue: 'Article not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    const body = req.body as Record<string, unknown>
    const result = await updateById('knowledge_articles', req.params.id as string, {
      ...body,
      // Re-index whenever content changes; left to the worker queue in
      // production. For E2E we just flip the status flag so callers can
      // assert against it.
      embedding_status:
        body.title !== undefined || body.content !== undefined || body.body_md !== undefined
          ? 'pending'
          : (check.row as { embedding_status?: string }).embedding_status,
      updated_at: now,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('knowledge.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete article — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('knowledge_articles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('knowledge.notFound', {}, { defaultValue: 'Article not found' }),
      })
      return
    }
    await deleteById('knowledge_articles', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('knowledge.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
