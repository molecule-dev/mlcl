import type { Request, Response } from 'express'
import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index as indexDoc, search as searchIndex } from '@molecule/api-search'

import type { DiscussionBoardsLimits } from '../tiers.js'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  category_id: z.string().optional(),
  status: z.enum(['open', 'closed', 'archived', 'solved']).optional(),
  pinned: z.enum(['true', 'false']).optional(),
  author_id: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createTopicSchema = z.object({
  title: z.string().min(1).max(500),
  body_markdown: z.string().min(1).max(50000),
  category_id: z.string().min(1),
})

const updateTopicSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body_markdown: z.string().min(1).max(50000).optional(),
  category_id: z.string().optional(),
  status: z.enum(['open', 'closed', 'archived', 'solved']).optional(),
})

// --- Helpers ---

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  )
}

async function isModerator(res: Response): Promise<boolean> {
  const session = res.locals.session as { userId?: string } | undefined
  if (!session?.userId) return false
  const user = (await findById('users', session.userId)) as { role?: string } | null
  const role = user?.role ?? 'member'
  return role === 'moderator' || role === 'admin'
}

async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await indexDoc('topics', id, doc)
  } catch (_error) {
    /* indexing failures must not break writes — DB is source of truth */
  }
}

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { category_id, status, pinned, author_id, q, page, limit } =
      req.query as unknown as z.infer<typeof listQuerySchema>

    if (q && q.trim()) {
      try {
        const result = await searchIndex('topics', { text: q, page, perPage: limit })
        res.json(result)
        return
      } catch (_error) {
        // fall through to DB-side ILIKE if the search bond is unavailable
      }
    }

    const where: WhereCondition[] = []
    if (category_id) where.push({ field: 'category_id', operator: '=', value: category_id })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (pinned !== undefined)
      where.push({ field: 'is_pinned', operator: '=', value: pinned === 'true' })
    if (author_id) where.push({ field: 'author_id', operator: '=', value: author_id })
    if (q && q.trim()) where.push({ field: 'title', operator: 'ilike', value: q })

    const topics = await findMany('topics', {
      where: where.length ? where : undefined,
      limit,
      offset: (page - 1) * limit,
      orderBy: [
        { field: 'is_pinned', direction: 'desc' },
        { field: 'last_reply_at', direction: 'desc' },
        { field: 'created_at', direction: 'desc' },
      ],
    })
    const total = await count('topics', where)
    res.json({ data: topics, total, page, limit })
  } catch (error) {
    logger.error('topics.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const rows = await findMany('topics', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    const topic = rows[0]
    if (!topic) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    res.json(topic)
  } catch (error) {
    logger.error('topics.getBySlug', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const topic = (await findById('topics', id)) as Record<string, unknown> | null
    if (!topic) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    // Public read — increment view count best-effort.
    try {
      await updateById('topics', id, {
        view_count: ((topic.view_count as number) || 0) + 1,
      })
    } catch (_error) {
      /* best-effort view count increment; read response is unaffected */
    }
    res.json(topic)
  } catch (error) {
    logger.error('topics.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier topic cap (tiers.ts maxTopics) — defined + shown on Pricing
// but enforceLimit was never called, so any tier could create unlimited topics.
// Mirrors the sibling forum's maxThreads gate (owner = author_id).
const enforceTopicLimit = enforceLimit<DiscussionBoardsLimits>({
  limitType: 'maxTopics',
  getLimit: (limits) => limits.maxTopics,
  getCurrent: async (userId) =>
    count('topics', [{ field: 'author_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceTopicLimit,
  validateBody(createTopicSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createTopicSchema>
      const slug = generateSlug(body.title)
      const now = new Date().toISOString()
      const result = await create('topics', {
        title: body.title,
        slug,
        body_markdown: body.body_markdown,
        category_id: body.category_id,
        author_id: userId,
        status: 'open',
        is_pinned: false,
        view_count: 0,
        post_count: 0,
        last_reply_at: now,
        last_reply_user_id: userId,
        created_at: now,
        updated_at: now,
      })
      const topic = result.data as Record<string, unknown> | undefined
      if (topic && topic.id) {
        await tryIndex(String(topic.id), topic)
      }
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('topics.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateTopicSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = (await findById('topics', id)) as Record<string, unknown> | null
    if (!existing) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    // Edit allowed only by author OR moderator/admin (per INVENTORY rules).
    if (existing.author_id !== userId && !(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    const result = await updateById('topics', id, updates)
    const topic = result.data as Record<string, unknown> | null
    if (topic && topic.id) {
      await tryIndex(String(topic.id), topic)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('topics.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = (await findById('topics', id)) as Record<string, unknown> | null
    if (!existing) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    if (existing.author_id !== userId && !(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    await deleteById('topics', id)
    res.status(204).end()
  } catch (error) {
    logger.error('topics.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Moderator-only operations: pin, unpin, close, reopen.
router.post('/:id/pin', async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById('topics', id)
    if (!existing) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    const result = await updateById('topics', id, {
      is_pinned: true,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('topics.pin', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/unpin', async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById('topics', id)
    if (!existing) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    const result = await updateById('topics', id, {
      is_pinned: false,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('topics.unpin', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById('topics', id)
    if (!existing) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    const result = await updateById('topics', id, {
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('topics.close', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/reopen', async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById('topics', id)
    if (!existing) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    const result = await updateById('topics', id, {
      status: 'open',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('topics.reopen', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
