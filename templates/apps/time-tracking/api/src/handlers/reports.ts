import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const dateRangeSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

router.get('/summary', validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const { start_date, end_date } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (start_date) where.push({ field: 'started_at', operator: '>=', value: start_date })
    if (end_date) where.push({ field: 'started_at', operator: '<=', value: end_date })

    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'desc' }]
    const entries = await findMany<{
      project_id: string | null
      duration_seconds: number | null
      is_billable: boolean
    }>('time_entries', { where, orderBy, limit: 5000 })

    const byProject = new Map<
      string,
      {
        project_id: string | null
        total_seconds: number
        billable_seconds: number
        entries_count: number
      }
    >()

    for (const entry of entries) {
      const key = entry.project_id ?? 'no-project'
      const existing = byProject.get(key) ?? {
        project_id: entry.project_id,
        total_seconds: 0,
        billable_seconds: 0,
        entries_count: 0,
      }
      const dur = entry.duration_seconds ?? 0
      existing.total_seconds += dur
      if (entry.is_billable) existing.billable_seconds += dur
      existing.entries_count++
      byProject.set(key, existing)
    }

    res.json(Array.from(byProject.values()))
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/daily', validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const { start_date, end_date } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (start_date) where.push({ field: 'started_at', operator: '>=', value: start_date })
    if (end_date) where.push({ field: 'started_at', operator: '<=', value: end_date })

    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'asc' }]
    const entries = await findMany<{
      started_at: string | Date
      duration_seconds: number | null
    }>('time_entries', { where, orderBy, limit: 5000 })

    const byDay = new Map<string, number>()
    for (const entry of entries) {
      // started_at may be a Date object (pg driver) or an ISO string (mock).
      const iso =
        entry.started_at instanceof Date ? entry.started_at.toISOString() : String(entry.started_at)
      const day = iso.split('T')[0]
      byDay.set(day, (byDay.get(day) ?? 0) + (entry.duration_seconds ?? 0))
    }

    const result = Array.from(byDay.entries()).map(([date, totalSeconds]) => ({
      date,
      total_seconds: totalSeconds,
      total_hours: Math.round((totalSeconds / 3600) * 100) / 100,
    }))
    res.json(result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
