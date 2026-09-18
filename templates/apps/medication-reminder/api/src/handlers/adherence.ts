/**
 * Adherence aggregations — read-only endpoints that summarize dose-log
 * status (taken / skipped / missed) over a windowed range.
 *
 * - Every read scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const overviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
})

const byMedQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
})

router.get(
  '/overview',
  validateQuery(overviewQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const days = (req.query as z.infer<typeof overviewQuerySchema>).days ?? 7
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    const doses = (await findMany('dose_logs', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'scheduled_date', operator: '>=', value: sinceStr },
      ],
      orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
    })) as Array<Record<string, unknown>>
    const taken = doses.filter((d) => d.status === 'taken').length
    const skipped = doses.filter((d) => d.status === 'skipped').length
    const missed = doses.filter((d) => d.status === 'missed').length
    const pending = doses.filter((d) => d.status === 'pending' || d.status === 'scheduled').length
    const total = doses.length
    const settled = total - pending
    const rate = settled > 0 ? Math.round((taken / settled) * 100) : null
    res.json({
      adherence_rate: rate,
      taken,
      skipped,
      missed,
      pending,
      total,
    })
  },
)

router.get(
  '/by-medication',
  validateQuery(byMedQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const days = (req.query as z.infer<typeof byMedQuerySchema>).days ?? 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    const [doses, meds] = await Promise.all([
      findMany('dose_logs', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'scheduled_date', operator: '>=', value: sinceStr },
        ],
      }) as Promise<Array<Record<string, unknown>>>,
      findMany('medications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }) as Promise<Array<Record<string, unknown>>>,
    ])
    const nameById = new Map<string, string>()
    for (const m of meds) nameById.set(String(m.id), String(m.name ?? m.id))
    const byMed: Record<string, { name: string; taken: number; total: number }> = {}
    for (const dose of doses) {
      const medId = String(dose.medication_id)
      const medName = nameById.get(medId) ?? medId
      if (!byMed[medId]) byMed[medId] = { name: medName, taken: 0, total: 0 }
      byMed[medId].total++
      if (dose.status === 'taken') byMed[medId].taken++
    }
    const results = Object.entries(byMed)
      .map(([id, data]) => ({
        medication_id: id,
        medication_name: data.name,
        taken: data.taken,
        total: data.total,
        rate: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.rate - b.rate)
    res.json(results)
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
  const doses = (await findMany('dose_logs', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'scheduled_date', direction: 'desc' }],
    limit: 365,
  })) as Array<Record<string, unknown>>
  // Group doses by ISO date so a day either fully-taken (streak day),
  // partially-taken (streak break), or has no doses (streak break).
  const byDate = new Map<string, Array<Record<string, unknown>>>()
  for (const d of doses) {
    const date = String(d.scheduled_date ?? '')
    if (!date) continue
    const list = byDate.get(date) ?? []
    list.push(d)
    byDate.set(date, list)
  }
  const isFullyTaken = (date: string): boolean => {
    const dayDoses = byDate.get(date)
    if (!dayDoses || dayDoses.length === 0) return false
    return dayDoses.every((d) => d.status === 'taken')
  }
  // current_streak: count back from today while every scheduled dose is taken.
  let currentStreak = 0
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setUTCDate(checkDate.getUTCDate() - i)
    const dateStr = checkDate.toISOString().slice(0, 10)
    if (!isFullyTaken(dateStr)) break
    currentStreak++
  }
  // longest_streak: scan all known dates and find the max consecutive
  // run of fully-taken days (using calendar-day adjacency).
  const sortedDates = Array.from(byDate.keys()).sort()
  let longestStreak = 0
  let runStart: Date | null = null
  let runLength = 0
  for (const dateStr of sortedDates) {
    if (!isFullyTaken(dateStr)) {
      if (runLength > longestStreak) longestStreak = runLength
      runStart = null
      runLength = 0
      continue
    }
    const date = new Date(`${dateStr}T00:00:00Z`)
    if (runStart === null) {
      runStart = date
      runLength = 1
    } else {
      const expectedNext = new Date(runStart)
      expectedNext.setUTCDate(expectedNext.getUTCDate() + runLength)
      if (date.getTime() === expectedNext.getTime()) {
        runLength++
      } else {
        if (runLength > longestStreak) longestStreak = runLength
        runStart = date
        runLength = 1
      }
    }
  }
  if (runLength > longestStreak) longestStreak = runLength
  res.json({ current_streak: currentStreak, longest_streak: longestStreak, streak: currentStreak })
})

export default router
