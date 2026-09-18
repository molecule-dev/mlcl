/**
 * Nutrition aggregations: daily averages, macro breakdown, streak.
 *
 * - All reads scoped by `user_id`.
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

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const dateQuerySchema = z.object({
  date: z.string().min(1),
})

const rangeQuerySchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
})

interface DiaryRow {
  /**
   * Postgres `date` columns are returned as JS `Date` objects by the
   * `pg` driver — never assume the wire-side string is what comes back.
   * Always normalize via `dateKey()` before using as a Map key or
   * comparing against an ISO string.
   */
  date: string | Date
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
}

interface GoalRow {
  calories: number | string
}

/**
 * Normalize a value from the diary_entries.date column to a YYYY-MM-DD key.
 *
 * The pg driver hands back DATE columns as JS `Date` objects positioned at
 * **local-time** midnight (postgres-date parses `YYYY-MM-DD` via
 * `new Date(year, monthIndex, day)`). Using `toISOString()` on those would
 * shift the calendar day across the local TZ offset; format from
 * local-tz components instead.
 */
const dateKey = (v: string | Date): string => {
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v).slice(0, 10)
}

router.get(
  '/daily-averages',
  validateQuery(rangeQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { start_date: startDate, end_date: endDate } = req.query as unknown as z.infer<
      typeof rangeQuerySchema
    >
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '>=', value: startDate },
      { field: 'date', operator: '<=', value: endDate },
    ]
    const orderBy: OrderBy[] = [{ field: 'date', direction: 'asc' }]
    const entries = await findMany<DiaryRow>('diary_entries', { where, orderBy })

    const dailyMap = new Map<
      string,
      { calories: number; protein: number; carbs: number; fat: number }
    >()
    for (const e of entries) {
      const k = dateKey(e.date)
      const existing = dailyMap.get(k) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
      dailyMap.set(k, {
        calories: existing.calories + num(e.calories),
        protein: existing.protein + num(e.protein),
        carbs: existing.carbs + num(e.carbs),
        fat: existing.fat + num(e.fat),
      })
    }

    const days = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totals]) => ({ date, ...totals }))
    const dayCount = days.length || 1

    res.json({
      days,
      averages: {
        calories: Math.round(days.reduce((s, d) => s + d.calories, 0) / dayCount),
        protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / dayCount),
        carbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / dayCount),
        fat: Math.round(days.reduce((s, d) => s + d.fat, 0) / dayCount),
      },
    })
  },
)

router.get(
  '/macro-breakdown',
  validateQuery(dateQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { date } = req.query as z.infer<typeof dateQuerySchema>
    const entries = await findMany<DiaryRow>('diary_entries', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'date', operator: '=', value: date },
      ],
    })

    const totals = entries.reduce(
      (acc, e) => ({
        protein: acc.protein + num(e.protein),
        carbs: acc.carbs + num(e.carbs),
        fat: acc.fat + num(e.fat),
      }),
      { protein: 0, carbs: 0, fat: 0 },
    )

    const totalCalFromMacros = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
    res.json({
      totals,
      percentages: {
        protein:
          totalCalFromMacros > 0
            ? Math.round(((totals.protein * 4) / totalCalFromMacros) * 100)
            : 0,
        carbs:
          totalCalFromMacros > 0 ? Math.round(((totals.carbs * 4) / totalCalFromMacros) * 100) : 0,
        fat: totalCalFromMacros > 0 ? Math.round(((totals.fat * 9) / totalCalFromMacros) * 100) : 0,
      },
    })
  },
)

router.get('/streak', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const goalRows = await findMany<GoalRow>('nutrition_goals', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_active', operator: '=', value: true },
    ],
    limit: 1,
  })
  const targetCalories = goalRows.length > 0 ? num(goalRows[0].calories) : 2000
  const tolerance = targetCalories * 0.1

  const entries = await findMany<DiaryRow>('diary_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'date', direction: 'desc' }],
    limit: 1000,
  })

  const dailyTotals = new Map<string, number>()
  for (const e of entries) {
    const k = dateKey(e.date)
    dailyTotals.set(k, (dailyTotals.get(k) ?? 0) + num(e.calories))
  }

  let streak = 0
  const date = new Date()
  for (;;) {
    // Map keys are local-tz YYYY-MM-DD (see dateKey); use local-tz here too.
    const dateStr = dateKey(date)
    const total = dailyTotals.get(dateStr)
    if (total === undefined) break
    if (Math.abs(total - targetCalories) > tolerance) break
    streak++
    date.setDate(date.getDate() - 1)
  }

  res.json({
    current_streak: streak,
    target_calories: targetCalories,
    total_logged_days: dailyTotals.size,
  })
})

export default router
