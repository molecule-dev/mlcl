import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  target_type: z.enum(['topic', 'post']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

const createReportSchema = z.object({
  target_type: z.enum(['topic', 'post']),
  target_id: z.string().min(1),
  reason: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
})

const resolveSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  resolution_note: z.string().max(2000).optional(),
})

// --- Helpers ---

async function isModerator(res: Response): Promise<boolean> {
  const session = res.locals.session as { userId?: string } | undefined
  if (!session?.userId) return false
  const user = (await findById('users', session.userId)) as { role?: string } | null
  const role = user?.role ?? 'member'
  return role === 'moderator' || role === 'admin'
}

// --- Routes (mounted under /moderation-reports) ---

// List reports — moderator/admin only.
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const { status, target_type, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (target_type) where.push({ field: 'target_type', operator: '=', value: target_type })
    const reports = await findMany('moderation_reports', {
      where: where.length ? where : undefined,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const total = await count('moderation_reports', where)
    res.json({ data: reports, total, page, limit })
  } catch (error) {
    logger.error('moderation.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create a report — any authenticated user can flag (self-only writes).
router.post('/', validateBody(createReportSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createReportSchema>
    const now = new Date().toISOString()
    const result = await create('moderation_reports', {
      target_type: body.target_type,
      target_id: body.target_id,
      reporter_id: userId,
      reason: body.reason,
      description: body.description,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('moderation.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Resolve a report — moderator only.
router.post('/:id/resolve', validateBody(resolveSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const id = req.params.id as string
    const existing = await findById('moderation_reports', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('moderation.notFound', {}, { defaultValue: 'Report not found' }) })
      return
    }
    const { status } = req.body as z.infer<typeof resolveSchema>
    const now = new Date().toISOString()
    const result = await updateById('moderation_reports', id, {
      status,
      resolver_id: userId,
      resolved_at: now,
      updated_at: now,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('moderation.resolve', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
