import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createHistorySchema = z.object({
  session_id: z.string().min(1),
  course_id: z.string().nullable().optional(),
  duration_seconds: z.number().int().nonnegative(),
  started_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { session_id, course_id, start_date, end_date, limit, offset } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (session_id) where.push({ field: 'session_id', operator: '=', value: String(session_id) })
    if (course_id) where.push({ field: 'course_id', operator: '=', value: String(course_id) })
    if (start_date)
      where.push({ field: 'started_at', operator: '>=', value: new Date(String(start_date)) })
    if (end_date)
      where.push({ field: 'started_at', operator: '<=', value: new Date(String(end_date)) })

    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'desc' }]
    const entries = await findMany('meditation_history', {
      where,
      orderBy,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    })
    res.json(entries)
  } catch (error) {
    logger.error('history.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const entry = await findById<Record<string, unknown>>('meditation_history', id)
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({
        error: t('history.notFound', {}, { defaultValue: 'History entry not found' }),
      })
    }
    res.json(entry)
  } catch (error) {
    logger.error('history.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createHistorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const body = req.body as z.infer<typeof createHistorySchema>
    const startedAt = body.started_at ? new Date(body.started_at) : new Date()
    const completedAt = body.completed_at ? new Date(body.completed_at) : new Date()

    const result = await create('meditation_history', {
      user_id: userId,
      session_id: body.session_id,
      course_id: body.course_id ?? null,
      started_at: startedAt,
      completed_at: completedAt,
      duration_seconds: body.duration_seconds,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('history.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meditation_history', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('history.notFound', {}, { defaultValue: 'History entry not found' }),
      })
    }
    await deleteById('meditation_history', id)
    res.status(204).end()
  } catch (error) {
    logger.error('history.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
