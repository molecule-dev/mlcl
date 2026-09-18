/**
 * Review-queue handler — webhook intake buffer.
 *
 * Routes:
 *   GET    /review-queue           list owner's queued / in-progress jobs
 *   GET    /review-queue/:id       single queue entry
 *   POST   /review-queue           enqueue a manual run (mostly for tests + retries)
 *   PUT    /review-queue/:id       update status / increment attempts
 *   DELETE /review-queue/:id       drop a stale entry
 *
 * Owner-scoped (G6 — IDOR-safe).
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
  status: z.enum(['pending', 'in_progress', 'done', 'failed']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const createSchema = z.object({
  repository_id: z.string().uuid(),
  pr_id: z.string().uuid().optional(),
  payload_json: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'failed']).optional(),
  attempts: z.number().int().min(0).optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const items = await findMany('review_queue', {
      where,
      orderBy: [{ field: 'enqueued_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (err) {
    logger.error('review_queue.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('review_queue', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviewQueue.notFound', {}, { defaultValue: 'Queue entry not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('review_queue.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createSchema>
    const repoCheck = await requireOwnership('repositories', body.repository_id, userId)
    if (!repoCheck.ok) {
      res.status(repoCheck.status).json({
        error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }),
      })
      return
    }
    const id = randomUUID()
    const created = await create('review_queue', {
      id,
      owner_id: userId,
      user_id: userId,
      repository_id: body.repository_id,
      pr_id: body.pr_id ?? null,
      payload_json: body.payload_json ?? null,
      attempts: 0,
      status: 'pending',
      enqueued_at: new Date().toISOString(),
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('review_queue.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('review_queue', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviewQueue.notFound', {}, { defaultValue: 'Queue entry not found' }),
      })
      return
    }
    const updated = await updateById(
      'review_queue',
      req.params.id as string,
      req.body as Record<string, unknown>,
    )
    res.json(updated.data)
  } catch (err) {
    logger.error('review_queue.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('review_queue', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('reviewQueue.notFound', {}, { defaultValue: 'Queue entry not found' }),
      })
      return
    }
    await deleteById('review_queue', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('review_queue.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
