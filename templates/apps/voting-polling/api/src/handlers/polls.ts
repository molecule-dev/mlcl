import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import type { VotingPollingLimits } from '../tiers.js'
import { seedDemoOnSignup } from './_seed.js'

const router = Router()

const POLL_TYPES = ['single-choice', 'multiple-choice', 'ranked', 'open-text'] as const
const POLL_STATUSES = ['draft', 'active', 'closed'] as const

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(POLL_STATUSES).optional(),
  type: z.enum(POLL_TYPES).optional(),
})

const optionSchema = z.union([
  z.string().min(1),
  z.object({ label: z.string().min(1), image_url: z.string().url().optional() }),
])

const createPollSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    type: z.enum(POLL_TYPES),
    options: z.array(optionSchema).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    allow_anonymous: z.boolean().optional(),
    max_votes_per_user: z.number().int().min(1).max(100).optional(),
    quorum_threshold: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'open-text') {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'At least two options are required for choice-based polls',
        })
      }
    }
  })

const updatePollSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  options: z.array(optionSchema).optional(),
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
  allow_anonymous: z.boolean().optional(),
  max_votes_per_user: z.number().int().min(1).max(100).optional(),
  quorum_threshold: z.number().int().min(1).nullable().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }

    // Best-effort: seed a starter ballot + demo voters/notifications on
    // first GET so a fresh signup lands on a populated dashboard
    // without coupling the seed to the signup route. Idempotent.
    await seedDemoOnSignup(userId)

    const { page, limit, status, type } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (type) where.push({ field: 'type', operator: '=', value: type })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const polls = await findMany('polls', {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    })
    res.json(polls)
  } catch (err) {
    logger.error('polls.list', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const poll = await findById<Record<string, unknown>>('polls', id)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    res.json(poll)
  } catch (err) {
    logger.error('polls.get', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<VotingPollingLimits>({
    limitType: 'maxPolls',
    getLimit: (limits) => limits.maxPolls,
    getCurrent: async (userId) =>
      count('polls', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPollSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
        return
      }
      const body = req.body as z.infer<typeof createPollSchema>
      // jsonb columns must be JSON.stringify'd — the pg adapter would
      // otherwise convert a JS array via its native `{a,b,c}` literal,
      // which Postgres rejects with `invalid input syntax for type json`.
      const optionsJson = JSON.stringify(body.type === 'open-text' ? [] : (body.options ?? []))
      const result = await create('polls', {
        user_id: userId,
        title: body.title,
        description: body.description ?? '',
        type: body.type,
        options: optionsJson,
        status: 'draft',
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
        allow_anonymous: body.allow_anonymous ?? false,
        max_votes_per_user: body.max_votes_per_user ?? 1,
        quorum_threshold: body.quorum_threshold ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('polls.create', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updatePollSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const poll = await findById<Record<string, unknown>>('polls', id)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    if (poll.status !== 'draft') {
      res.status(409).json({
        error: t(
          'polls.cannotEditActive',
          {},
          {
            defaultValue: 'Cannot edit an active or closed poll',
          },
        ),
      })
      return
    }
    const body = req.body as z.infer<typeof updatePollSchema>
    const updateData: Record<string, unknown> = { ...body, updated_at: new Date() }
    if (body.options !== undefined) {
      // See note above on JSON.stringify for jsonb columns.
      updateData.options = JSON.stringify(body.options)
    }
    const result = await updateById('polls', id, updateData)
    res.json(result.data)
  } catch (err) {
    logger.error('polls.update', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const poll = await findById<Record<string, unknown>>('polls', id)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    if (poll.status !== 'draft') {
      res.status(409).json({
        error: t(
          'polls.alreadyPublished',
          {},
          {
            defaultValue: 'Poll is already published or closed',
          },
        ),
      })
      return
    }
    const result = await updateById('polls', id, {
      status: 'active',
      start_date: poll.start_date ?? new Date(),
      updated_at: new Date(),
    })
    try {
      await broadcast(`poll:${id}`, 'poll:published', { pollId: id })
    } catch (_error) {
      // broadcast failure is non-fatal — no subscribers yet is normal
    }
    res.json(result.data)
  } catch (err) {
    logger.error('polls.publish', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const poll = await findById<Record<string, unknown>>('polls', id)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    if (poll.status !== 'active') {
      res.status(409).json({
        error: t('polls.cannotClose', {}, { defaultValue: 'Only active polls can be closed' }),
      })
      return
    }
    const result = await updateById('polls', id, {
      status: 'closed',
      end_date: new Date(),
      updated_at: new Date(),
    })
    try {
      await broadcast(`poll:${id}`, 'poll:closed', { pollId: id })
    } catch (_error) {
      // broadcast failure is non-fatal — no subscribers yet is normal
    }
    res.json(result.data)
  } catch (err) {
    logger.error('polls.close', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const poll = await findById<Record<string, unknown>>('polls', id)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    if (poll.status !== 'draft') {
      res.status(409).json({
        error: t(
          'polls.cannotDeleteActive',
          {},
          {
            defaultValue: 'Cannot delete an active or closed poll. Close it first.',
          },
        ),
      })
      return
    }
    await deleteById('polls', id)
    res.status(204).end()
  } catch (err) {
    logger.error('polls.delete', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
