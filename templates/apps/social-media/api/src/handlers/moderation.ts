import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const reportSchema = z.object({
  target_type: z.enum(['post', 'comment', 'story', 'user', 'message']),
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
})

const resolveSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed']),
  resolution: z.string().max(500).nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const reports = await findMany('moderation_reports', {
      where: [{ field: 'reporter_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    res.json(reports)
  } catch (error) {
    logger.error('moderation.getReports', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const result = await create('moderation_reports', {
      reporter_id: userId,
      target_type: parsed.data.target_type,
      target_id: parsed.data.target_id,
      reason: parsed.data.reason,
      status: 'pending',
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('moderation.postReport', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('moderation_reports', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('moderation.notFound', {}, { defaultValue: 'Report not found' }) })
    }
    if (existing.reporter_id !== userId) {
      return res
        .status(403)
        .json({ error: t('moderation.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const parsed = resolveSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const updates: Record<string, unknown> = { status: parsed.data.status }
    if (parsed.data.resolution !== undefined) updates.resolution = parsed.data.resolution
    if (parsed.data.status === 'resolved' || parsed.data.status === 'dismissed') {
      updates.resolved_by = userId
      updates.resolved_at = new Date()
    }
    const result = await updateById('moderation_reports', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('moderation.patchReport', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
