import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const dateRangeSchema = z.object({
  start_date: z.string().min(1).optional(),
  end_date: z.string().min(1).optional(),
})

function defaultRange(start?: string, end?: string): { start: Date; end: Date } {
  const endDate = end ? new Date(end) : new Date()
  const startDate = start ? new Date(start) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  return { start: startDate, end: endDate }
}

function asIsoDate(value: unknown): string {
  return new Date(String(value)).toISOString().split('T')[0]
}

router.get('/streak', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'desc' }]
    const history = await findMany<Record<string, unknown>>('meditation_history', {
      where,
      orderBy,
    })

    const dates = Array.from(new Set(history.map((h) => asIsoDate(h.started_at))))
      .sort()
      .reverse()

    let currentStreak = 0
    const today = new Date()
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today)
      expected.setUTCDate(expected.getUTCDate() - i)
      const expectedDate = expected.toISOString().split('T')[0]
      if (dates[i] === expectedDate) currentStreak++
      else break
    }

    // Longest streak is the longest run of consecutive calendar days ANYWHERE in history, not just
    // the run ending today — it used to just alias current_streak, so "Best streak" and the 7-day
    // achievement collapsed to 0 the moment today was skipped. dates is distinct + sorted descending,
    // so consecutive means each date is exactly one day (86_400_000 ms) before the previous.
    let longestStreak = 0
    let run = 0
    let prevMs: number | null = null
    for (const d of dates) {
      const ms = new Date(`${d}T00:00:00.000Z`).getTime()
      run = prevMs !== null && prevMs - ms === 86_400_000 ? run + 1 : 1
      if (run > longestStreak) longestStreak = run
      prevMs = ms
    }

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_sessions: history.length,
      total_days: dates.length,
    })
  } catch (error) {
    logger.error('stats.streak', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/summary', validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { start_date, end_date } = req.query as unknown as z.infer<typeof dateRangeSchema>
    const { start, end } = defaultRange(start_date, end_date)
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'started_at', operator: '>=', value: start },
      { field: 'started_at', operator: '<=', value: end },
    ]
    const history = await findMany<Record<string, unknown>>('meditation_history', { where })

    const totalSessions = history.length
    const totalSeconds = history.reduce(
      (sum, h) => sum + (typeof h.duration_seconds === 'number' ? h.duration_seconds : 0),
      0,
    )
    const totalMinutes = Math.round(totalSeconds / 60)
    const avgDuration = totalSessions > 0 ? Math.round(totalSeconds / 60 / totalSessions) : 0
    const uniqueDays = new Set(history.map((h) => asIsoDate(h.started_at))).size

    res.json({
      total_sessions: totalSessions,
      total_minutes: totalMinutes,
      avg_duration_minutes: avgDuration,
      unique_days: uniqueDays,
    })
  } catch (error) {
    logger.error('stats.summary', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/daily', validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { start_date, end_date } = req.query as unknown as z.infer<typeof dateRangeSchema>
    const { start, end } = defaultRange(start_date, end_date)
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'started_at', operator: '>=', value: start },
      { field: 'started_at', operator: '<=', value: end },
    ]
    const orderBy: OrderBy[] = [{ field: 'started_at', direction: 'asc' }]
    const history = await findMany<Record<string, unknown>>('meditation_history', {
      where,
      orderBy,
    })

    const dailyMap = new Map<string, { sessions: number; minutes: number }>()
    for (const entry of history) {
      const date = asIsoDate(entry.started_at)
      const existing = dailyMap.get(date) || { sessions: 0, minutes: 0 }
      existing.sessions++
      existing.minutes +=
        (typeof entry.duration_seconds === 'number' ? entry.duration_seconds : 0) / 60
      dailyMap.set(date, existing)
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      sessions: data.sessions,
      minutes: Math.round(data.minutes),
    }))

    res.json(daily)
  } catch (error) {
    logger.error('stats.daily', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
