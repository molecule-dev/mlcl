/**
 * Reviews + review_comments handler.
 *
 * Routes:
 *   GET    /reviews                          list owner's reviews
 *   GET    /reviews/:id                      single review (with comments)
 *   POST   /reviews                          enqueue a review for a PR
 *   PUT    /reviews/:id                      update review (status / score / summary)
 *   DELETE /reviews/:id                      delete review
 *   GET    /reviews/:id/comments             list comments for a review
 *   POST   /reviews/:id/comments             add an inline comment
 *
 * Owner-scoped via `owner_id` (G6 — IDOR-safe).
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireOwnership } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['queued', 'running', 'completed', 'failed']).optional(),
  pr_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const createSchema = z.object({
  pr_id: z.string().uuid(),
  status: z.enum(['queued', 'running', 'completed', 'failed']).optional().default('queued'),
})

const updateSchema = z.object({
  status: z.enum(['queued', 'running', 'completed', 'failed']).optional(),
  quality_score: z.number().int().min(0).max(100).optional(),
  severity_summary_json: z.record(z.string(), z.number().int()).optional(),
  tokens_used: z.number().int().min(0).optional(),
  cost_cents: z.number().int().min(0).optional(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
})

const commentSchema = z.object({
  file_path: z.string().min(1).max(1024),
  line_start: z.number().int().min(0),
  line_end: z.number().int().min(0).optional(),
  severity: z.enum(['high', 'med', 'low', 'info']).optional().default('info'),
  category: z.enum(['bug', 'style', 'security', 'perf', 'maintainability']).optional(),
  body_md: z.string().min(1).max(20_000),
  suggested_patch: z.string().max(40_000).optional(),
  anchor_sha: z.string().max(64).optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, pr_id, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (pr_id) where.push({ field: 'pr_id', operator: '=', value: pr_id })
    const items = await findMany('reviews', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (err) {
    logger.error('reviews.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('reviews', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviews.notFound', {}, { defaultValue: 'Review not found' }),
      })
      return
    }
    const comments = await findMany('review_comments', {
      where: [{ field: 'review_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'line_start', direction: 'asc' }],
    })
    res.json({ ...(check.row as Record<string, unknown>), comments })
  } catch (err) {
    logger.error('reviews.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('reviews', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviews.notFound', {}, { defaultValue: 'Review not found' }),
      })
      return
    }
    const comments = await findMany('review_comments', {
      where: [{ field: 'review_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'line_start', direction: 'asc' }],
    })
    res.json(comments)
  } catch (err) {
    logger.error('reviews.listComments', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createSchema>
    const prCheck = await requireOwnership('pull_requests', body.pr_id, userId)
    if (!prCheck.ok) {
      res.status(prCheck.status).json({
        error: t('pullRequests.notFound', {}, { defaultValue: 'Pull request not found' }),
      })
      return
    }
    const id = randomUUID()
    const created = await create('reviews', {
      id,
      owner_id: userId,
      user_id: userId,
      pr_id: body.pr_id,
      status: body.status,
      started_at: body.status === 'running' ? new Date().toISOString() : null,
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('reviews.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('reviews', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviews.notFound', {}, { defaultValue: 'Review not found' }),
      })
      return
    }
    const patch = { ...(req.body as Record<string, unknown>) }
    // Derive the lifecycle timestamps server-side on a status transition, mirroring the create
    // path (which sets started_at for a running review). Reports order by completed_at and
    // compute time-to-complete from it, so a review marked 'completed' with a null completed_at
    // silently breaks them. An explicit client-supplied value still wins.
    if (patch.status === 'completed' && patch.completed_at === undefined) {
      patch.completed_at = new Date().toISOString()
    }
    if (patch.status === 'running' && patch.started_at === undefined) {
      patch.started_at = new Date().toISOString()
    }
    const updated = await updateById('reviews', req.params.id as string, patch)
    res.json(updated.data)
  } catch (err) {
    logger.error('reviews.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('reviews', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviews.notFound', {}, { defaultValue: 'Review not found' }),
      })
      return
    }
    await deleteById('reviews', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('reviews.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/comments', validateBody(commentSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('reviews', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviews.notFound', {}, { defaultValue: 'Review not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof commentSchema>
    const id = randomUUID()
    const created = await create('review_comments', {
      id,
      owner_id: userId,
      user_id: userId,
      review_id: req.params.id as string,
      file_path: body.file_path,
      line_start: body.line_start,
      line_end: body.line_end ?? null,
      severity: body.severity,
      category: body.category ?? null,
      body_md: body.body_md,
      suggested_patch: body.suggested_patch ?? null,
      anchor_sha: body.anchor_sha ?? null,
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('reviews.createComment', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
