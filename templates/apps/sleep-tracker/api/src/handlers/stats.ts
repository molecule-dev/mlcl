/**
 * Sleep aggregate stats handlers (overview / trends / weekly).
 *
 * - Every aggregation scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const rangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
})

router.get(
  '/overview',
  validateQuery(rangeQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const { days } = req.query as z.infer<typeof rangeQuerySchema>
    const since = new Date()
    since.setDate(since.getDate() - (days ?? 7))

    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'sleep_date', operator: '>=', value: since.toISOString().slice(0, 10) },
    ]
    const orderBy: OrderBy[] = [{ field: 'sleep_date', direction: 'desc' }]
    const logs = await findMany<Record<string, unknown>>('sleep_logs', {
      where,
      orderBy,
      limit: 500,
      offset: 0,
    })

    if (logs.length === 0) {
      res.json({
        average_duration: null,
        average_quality: null,
        total_logs: 0,
        best_night: null,
        worst_night: null,
      })
      return
    }

    const durations = logs.map((l) => Number(l.duration_minutes ?? 0))
    const qualities = logs
      .map((l) => l.quality_score)
      .filter((q): q is number => typeof q === 'number')

    res.json({
      average_duration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      average_quality:
        qualities.length > 0
          ? Number((qualities.reduce((a, b) => a + b, 0) / qualities.length).toFixed(1))
          : null,
      total_logs: logs.length,
      best_night: Math.max(...durations),
      worst_night: Math.min(...durations),
    })
  },
)

router.get(
  '/trends',
  validateQuery(rangeQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const { days } = req.query as z.infer<typeof rangeQuerySchema>
    const since = new Date()
    since.setDate(since.getDate() - (days ?? 30))

    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'sleep_date', operator: '>=', value: since.toISOString().slice(0, 10) },
    ]
    const orderBy: OrderBy[] = [{ field: 'sleep_date', direction: 'asc' }]
    const logs = await findMany('sleep_logs', { where, orderBy, limit: 500, offset: 0 })
    res.json(logs)
  },
)

router.get('/weekly', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const where: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'sleep_date', operator: '>=', value: weekAgo.toISOString().slice(0, 10) },
  ]
  const orderBy: OrderBy[] = [{ field: 'sleep_date', direction: 'asc' }]
  const logs = await findMany<Record<string, unknown>>('sleep_logs', {
    where,
    orderBy,
    limit: 31,
    offset: 0,
  })

  const byDay = logs.map((log) => ({
    date: log.sleep_date,
    duration: log.duration_minutes,
    quality: log.quality_score,
    bedtime: log.bedtime,
    wake_time: log.wake_time,
  }))
  res.json(byDay)
})

export default router
