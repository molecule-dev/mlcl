/**
 * Reports handler.
 *
 * Aggregates per-user dashboard/stats reads from raw `habits` + `habit_entries`
 * tables. Two endpoints feed the frontend:
 *   - GET /api/reports/today    — Dashboard "today" hero card data
 *   - GET /api/reports/overview — Dashboard + Stats stat blocks, weekly trend,
 *                                 by-category breakdown
 *
 * All reads are owner-scoped via the JWT session.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface HabitRow {
  id: string
  user_id: string
  name: string
  category: string | null
  current_streak: number
  longest_streak: number
  total_completions: number
  completed_today?: boolean
}

interface EntryRow {
  habit_id: string
  date: string | Date
}

function formatLocalDate(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pickMotivational(active: number, longest: number): string {
  if (longest === 0 && active === 0) return 'Pick one habit. Start the chain today.'
  if (longest === 1) return 'Day one is the hardest. Day two is easier.'
  if (longest >= 30) return `Thirty plus. Don't break the chain now.`
  if (active >= 3) return 'Multiple chains alive. Keep them all warm.'
  return 'Show up tomorrow. The chain rewards persistence.'
}

router.get('/today', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const habits = await findMany<HabitRow>('habits', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'archived_at', operator: 'is_null', value: null },
    ],
    limit: 500,
  })

  const longestActive = habits.reduce((m, h) => Math.max(m, h.current_streak), 0)
  const activeStreaks = habits.filter((h) => h.current_streak > 0).length

  // Available freezes = granted - consumed (used_for_date set). Freezes are
  // owner-scoped via user_id; the same shape as freezes.ts /balance.
  const totalFreezes = await count('habit_freezes', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const usedFreezes = await count('habit_freezes', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'used_for_date', operator: 'is_not_null', value: null },
  ])
  const freezesAvailable = Math.max(0, totalFreezes - usedFreezes)

  res.json({
    date: formatLocalDate(new Date()),
    active_streaks: activeStreaks,
    longest_active: longestActive,
    freezes_available: freezesAvailable,
    motivational_message: pickMotivational(activeStreaks, longestActive),
  })
})

router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const habits = await findMany<HabitRow>('habits', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'archived_at', operator: 'is_null', value: null },
    ],
    limit: 500,
  })

  // Pick the leader habits (longest CURRENT and longest EVER).
  let longestActive = { habit: '', days: 0 }
  let bestEver = { habit: '', days: 0 }
  for (const h of habits) {
    if (h.current_streak > longestActive.days) {
      longestActive = { habit: h.name, days: h.current_streak }
    }
    if (h.longest_streak > bestEver.days) {
      bestEver = { habit: h.name, days: h.longest_streak }
    }
  }

  // 12-week window of completion rate. Completion rate = entries-this-week /
  // (active habits × 7). Cheap aggregation in JS over a single read.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 7 * 12 + 1)

  const entries = habits.length
    ? await findMany<EntryRow>('habit_entries', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'date', operator: '>=', value: formatLocalDate(start) },
          { field: 'date', operator: '<=', value: formatLocalDate(today) },
        ] satisfies WhereCondition[],
        orderBy: [{ field: 'date', direction: 'asc' }] satisfies OrderBy[],
        limit: 5000,
      })
    : []

  // Group entries by ISO week-bucket (YYYY-MM-DD of bucket start).
  const weekly: Array<{ week: string; rate: number }> = []
  for (let i = 0; i < 12; i++) {
    const bucketStart = new Date(start)
    bucketStart.setDate(bucketStart.getDate() + i * 7)
    const bucketEnd = new Date(bucketStart)
    bucketEnd.setDate(bucketEnd.getDate() + 6)
    const weekKey = formatLocalDate(bucketStart)
    const inBucket = entries.filter((e) => {
      const d = formatLocalDate(e.date)
      return d >= formatLocalDate(bucketStart) && d <= formatLocalDate(bucketEnd)
    })
    const target = Math.max(1, habits.length * 7)
    weekly.push({ week: weekKey, rate: Math.min(1, inBucket.length / target) })
  }

  const todayStr = formatLocalDate(today)
  const todayEntries = entries.filter((e) => formatLocalDate(e.date) === todayStr)
  const completedToday = new Set(todayEntries.map((e) => e.habit_id)).size
  const currentCompletionRate = habits.length === 0 ? 0 : completedToday / habits.length

  // By-category breakdown — count habits and avg completion-rate per cat.
  const byCategoryMap = new Map<string, { count: number; totalRate: number }>()
  for (const h of habits) {
    const cat = h.category ?? 'other'
    const existing = byCategoryMap.get(cat) ?? { count: 0, totalRate: 0 }
    existing.count += 1
    // Approximate rate per habit = total completions / max(1, days since
    // creation). Without a created_at field per row, use longest_streak as
    // a proxy floor. This is informational only.
    existing.totalRate += Math.min(
      1,
      h.total_completions / Math.max(7, h.longest_streak * 1.5 || 7),
    )
    byCategoryMap.set(cat, existing)
  }
  const by_category = Array.from(byCategoryMap.entries()).map(([category, v]) => ({
    category,
    count: v.count,
    rate: v.count === 0 ? 0 : v.totalRate / v.count,
  }))

  const total_check_ins = entries.length
  // Naive change %: compare last 12 weeks vs prior 12 weeks. Without prior
  // window data we report 0% (no synthetic numbers).
  const total_check_ins_change_percent = 0

  res.json({
    total_check_ins,
    total_check_ins_change_percent,
    active_habits: habits.length,
    active_streaks: habits.filter((h) => h.current_streak > 0).length,
    current_completion_rate: currentCompletionRate,
    longest_active_streak: longestActive.days,
    longest_active_habit: longestActive.habit,
    best_ever_streak: bestEver.days,
    best_ever_habit: bestEver.habit,
    weekly_completion: weekly,
    by_category,
  })
})

export default router
