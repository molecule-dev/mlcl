/**
 * Aggregated reports — `/today` and `/adherence` — surface dashboard +
 * adherence-page metrics computed from `dose_logs`, `medications`, and
 * `medication_schedules`. Read-only and owner-scoped.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

// Postgres returns DATE columns as JS Date objects representing **local**
// midnight (e.g. a row stored as '2026-05-10' becomes Date(2026-05-10
// 00:00 local) — which is a different *UTC* day in any non-UTC timezone).
// We must therefore extract date components in local time, not via
// toISOString(), to match how the value was authored & queried in SQL.
const fmt = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const todayStr = (): string => fmt(new Date())

const dateStrAt = (offsetDays: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return fmt(d)
}

const PILL_COLORS = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow'] as const
type PillColor = (typeof PILL_COLORS)[number]
const isPillColor = (v: unknown): v is PillColor =>
  typeof v === 'string' && (PILL_COLORS as readonly string[]).includes(v)

const dateKey = (raw: unknown): string => {
  if (raw instanceof Date) return fmt(raw)
  if (typeof raw === 'string') return raw.slice(0, 10)
  return ''
}

const computeStreaks = (
  dosesByDay: Map<string, { taken: number; total: number }>,
): { current: number; longest: number } => {
  let current = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = fmt(d)
    const day = dosesByDay.get(key)
    if (!day || day.total === 0) break
    if (day.taken < day.total) break
    current++
  }
  const sortedKeys = Array.from(dosesByDay.keys()).sort()
  let longest = 0
  let run = 0
  let prev: Date | null = null
  for (const key of sortedKeys) {
    const day = dosesByDay.get(key)!
    if (day.total === 0 || day.taken < day.total) {
      run = 0
      prev = new Date(`${key}T00:00:00`)
      continue
    }
    const cur = new Date(`${key}T00:00:00`)
    if (prev) {
      const dayDiff = Math.round((cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000))
      if (dayDiff !== 1) run = 0
    }
    run++
    if (run > longest) longest = run
    prev = cur
  }
  return { current, longest }
}

router.get('/today', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const since = dateStrAt(365)
  const today = todayStr()
  const [doses, meds] = await Promise.all([
    findMany('dose_logs', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'scheduled_date', operator: '>=', value: since },
      ],
      orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
    }) as Promise<Array<Record<string, unknown>>>,
    findMany('medications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_active', operator: '=', value: true },
      ],
    }) as Promise<Array<Record<string, unknown>>>,
  ])

  const todaysDoses = doses.filter((d) => dateKey(d.scheduled_date) === today)
  const taken_count = todaysDoses.filter((d) => d.status === 'taken').length
  const missed_count = todaysDoses.filter((d) => d.status === 'missed').length
  const skipped_count = todaysDoses.filter((d) => d.status === 'skipped').length
  const upcoming_count = todaysDoses.filter(
    (d) => d.status === 'pending' || d.status === 'scheduled' || d.status === 'snoozed',
  ).length
  const total_doses = todaysDoses.length

  const dosesByDay = new Map<string, { taken: number; total: number }>()
  for (const dose of doses) {
    const key = dateKey(dose.scheduled_date)
    if (!key) continue
    const slot = dosesByDay.get(key) ?? { taken: 0, total: 0 }
    slot.total++
    if (dose.status === 'taken') slot.taken++
    dosesByDay.set(key, slot)
  }
  const { current: current_streak, longest: longest_streak } = computeStreaks(dosesByDay)

  const refills_due_soon = meds.filter((m) => Number(m.supply_remaining ?? 0) <= 7).length

  res.json({
    date: today,
    total_doses,
    taken_count,
    missed_count,
    skipped_count,
    upcoming_count,
    current_streak,
    longest_streak,
    refills_due_soon,
  })
})

router.get('/adherence', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const since30 = dateStrAt(30)
  const since365 = dateStrAt(365)
  const [doses30, doses365, meds] = await Promise.all([
    findMany('dose_logs', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'scheduled_date', operator: '>=', value: since30 },
      ],
    }) as Promise<Array<Record<string, unknown>>>,
    findMany('dose_logs', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'scheduled_date', operator: '>=', value: since365 },
      ],
    }) as Promise<Array<Record<string, unknown>>>,
    findMany('medications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }) as Promise<Array<Record<string, unknown>>>,
  ])

  const doses_taken_30d = doses30.filter((d) => d.status === 'taken').length
  const doses_missed_30d = doses30.filter((d) => d.status === 'missed').length
  const doses_skipped_30d = doses30.filter((d) => d.status === 'skipped').length
  const settled30 = doses_taken_30d + doses_missed_30d + doses_skipped_30d
  const current_adherence = settled30 > 0 ? doses_taken_30d / settled30 : 0

  // Build daily_30d series — emit a row for every day in the last 30, even if empty.
  const dailyMap = new Map<string, { taken: number; total: number }>()
  for (let i = 29; i >= 0; i--) {
    dailyMap.set(dateStrAt(i), { taken: 0, total: 0 })
  }
  for (const dose of doses30) {
    const key = dateKey(dose.scheduled_date)
    if (!dailyMap.has(key)) continue
    const slot = dailyMap.get(key)!
    slot.total++
    if (dose.status === 'taken') slot.taken++
  }
  const daily_30d = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    total: v.total,
    taken: v.taken,
  }))

  // by_medication aggregate over the 30-day window.
  const medById = new Map<string, Record<string, unknown>>()
  for (const m of meds) medById.set(String(m.id), m)
  const byMed = new Map<
    string,
    { name: string; pillColor: string; taken: number; total: number; missed: number }
  >()
  for (const dose of doses30) {
    const medId = String(dose.medication_id)
    const med = medById.get(medId)
    if (!med) continue
    const slot = byMed.get(medId) ?? {
      name: String(med.name ?? medId),
      pillColor: isPillColor(med.pill_color) ? med.pill_color : 'blue',
      taken: 0,
      total: 0,
      missed: 0,
    }
    slot.total++
    if (dose.status === 'taken') slot.taken++
    if (dose.status === 'missed') slot.missed++
    byMed.set(medId, slot)
  }
  const by_medication = Array.from(byMed.entries())
    .map(([id, v]) => ({
      medication_id: id,
      medication_name: v.name,
      pill_color: v.pillColor,
      adherence_rate: v.total > 0 ? v.taken / v.total : 0,
      missed_count: v.missed,
    }))
    .sort((a, b) => a.adherence_rate - b.adherence_rate)

  // Streaks computed from full year history.
  const dosesByDay = new Map<string, { taken: number; total: number }>()
  for (const dose of doses365) {
    const key = dateKey(dose.scheduled_date)
    if (!key) continue
    const slot = dosesByDay.get(key) ?? { taken: 0, total: 0 }
    slot.total++
    if (dose.status === 'taken') slot.taken++
    dosesByDay.set(key, slot)
  }
  const { current: current_streak, longest: longest_streak } = computeStreaks(dosesByDay)

  res.json({
    current_adherence,
    current_streak,
    longest_streak,
    doses_taken_30d,
    doses_missed_30d,
    doses_skipped_30d,
    by_medication,
    daily_30d,
  })
})

export default router
