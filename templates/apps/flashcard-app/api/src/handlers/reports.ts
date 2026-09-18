/**
 * Reports / aggregated stats handlers.
 *
 * Computes derived study metrics from cards + review_log + user_profiles.
 * These power the Dashboard hero card and the Stats overview.
 *
 * - Every read scopes by user_id.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const startOfDayIso = (d: Date): string => {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString()
}

const endOfDayIso = (d: Date): string => {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x.toISOString()
}

interface ReviewRow {
  id: string
  reviewed_at: string
  quality: number
  state?: string
}

interface CardRow {
  id: string
  state: string
  interval_days: number
  next_review: string
}

const computeRetention = (reviews: ReviewRow[]): number => {
  if (reviews.length === 0) return 0
  const passing = reviews.filter((r) => Number(r.quality) >= 3).length
  return passing / reviews.length
}

const motivational = (totalDue: number, reviewedToday: number, dailyGoal: number): string => {
  if (reviewedToday >= dailyGoal && dailyGoal > 0) {
    return t('reports.motivational.goalHit', undefined, {
      defaultValue: 'Daily goal hit. Memory rewards consistency, not effort.',
    })
  }
  if (totalDue === 0) {
    return t('reports.motivational.nothingDue', undefined, {
      defaultValue: 'Nothing due. A perfect day to learn something new.',
    })
  }
  if (totalDue >= 50) {
    return t('reports.motivational.bigStack', undefined, {
      defaultValue: 'A big stack today. Five-minute sprints add up — start where you can.',
    })
  }
  return t('reports.motivational.default', undefined, {
    defaultValue:
      'Memory rewards consistency, not effort. Five minutes today beats four hours next week.',
  })
}

router.get('/today', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const now = new Date()
  const dueWhere: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'next_review', operator: '<=', value: now.toISOString() },
  ]
  const totalDue = await count('cards', dueWhere)

  const reviewedToday = await count('review_log', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'reviewed_at', operator: '>=', value: startOfDayIso(now) },
    { field: 'reviewed_at', operator: '<=', value: endOfDayIso(now) },
  ])

  const profileMatches = await findMany<Record<string, unknown>>('user_profiles', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  const profile = profileMatches[0] ?? null
  const dailyGoal = (profile?.daily_goal as number) ?? 20
  const currentStreak = (profile?.current_streak as number) ?? 0

  res.json({
    date: startOfDayIso(now).slice(0, 10),
    total_due: totalDue,
    reviewed_today: reviewedToday,
    daily_goal: dailyGoal,
    current_streak: currentStreak,
    motivational_message: motivational(totalDue, reviewedToday, dailyGoal),
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

  const now = new Date()
  const thirty = new Date(now)
  thirty.setDate(thirty.getDate() - 30)
  const sixty = new Date(now)
  sixty.setDate(sixty.getDate() - 60)

  const orderRecent: OrderBy[] = [{ field: 'reviewed_at', direction: 'desc' }]

  // Last 30 days reviews
  const reviewsLast30 = await findMany<ReviewRow>('review_log', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'reviewed_at', operator: '>=', value: thirty.toISOString() },
    ],
    orderBy: orderRecent,
    limit: 5000,
  })

  // Previous 30 days reviews (for delta)
  const reviewsPrev30 = await findMany<ReviewRow>('review_log', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'reviewed_at', operator: '>=', value: sixty.toISOString() },
      { field: 'reviewed_at', operator: '<', value: thirty.toISOString() },
    ],
    orderBy: orderRecent,
    limit: 5000,
  })

  const totalReviews = reviewsLast30.length
  const prevTotal = reviewsPrev30.length
  const deltaPercent =
    prevTotal === 0
      ? totalReviews === 0
        ? 0
        : 100
      : ((totalReviews - prevTotal) / prevTotal) * 100

  const retentionRate = computeRetention(reviewsLast30)

  // Build per-day counts for the last 30 days (oldest -> newest left to right)
  const byDate = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    byDate.set(startOfDayIso(d).slice(0, 10), 0)
  }
  for (const r of reviewsLast30) {
    const k = String(r.reviewed_at).slice(0, 10)
    if (byDate.has(k)) byDate.set(k, (byDate.get(k) ?? 0) + 1)
  }
  const dailyReviews = Array.from(byDate.entries()).map(([date, count]) => ({ date, count }))

  // Card-state breakdown
  const cards = await findMany<CardRow>('cards', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 5000,
  })
  const totalCards = cards.length
  const stateCounts: Record<string, number> = { new: 0, learning: 0, review: 0, relearning: 0 }
  let mature = 0
  let young = 0
  let isNew = 0
  for (const c of cards) {
    const s = String(c.state ?? 'new')
    stateCounts[s] = (stateCounts[s] ?? 0) + 1
    const interval = Number(c.interval_days ?? 0)
    if (interval >= 21) mature += 1
    else if (s === 'new' || interval === 0) isNew += 1
    else young += 1
  }
  const byState = Object.entries(stateCounts).map(([state, count]) => ({
    state,
    count,
    pct: totalCards === 0 ? 0 : count / totalCards,
  }))

  // Streaks from profile
  const profileMatches = await findMany<Record<string, unknown>>('user_profiles', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  const profile = profileMatches[0] ?? null
  const currentStreak = (profile?.current_streak as number) ?? 0
  const longestStreak = (profile?.longest_streak as number) ?? 0

  // Average daily minutes — best-effort heuristic: 8 seconds per review.
  const dailyMinutesAvg = Math.round((totalReviews * 8) / 30 / 60)

  res.json({
    total_reviews: totalReviews,
    reviews_change_percent: Number(deltaPercent.toFixed(1)),
    current_streak: currentStreak,
    longest_streak: longestStreak,
    retention_rate: Number(retentionRate.toFixed(4)),
    daily_minutes_avg: dailyMinutesAvg,
    cards_mature: mature,
    cards_young: young,
    cards_new: isNew,
    by_state: byState,
    daily_reviews: dailyReviews,
  })
})

export default router
