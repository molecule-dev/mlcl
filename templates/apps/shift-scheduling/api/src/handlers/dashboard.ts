import type { Request, Response } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { buildLookups, type DecoratedShift, shiftHours, weekStartOf } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

/**
 * Dashboard / overview endpoint.
 *
 * Returns a single object the Dashboard page renders — roster KPIs, this
 * week's open shifts, pending approvals, hours scheduled vs the roster's
 * max-hours budget, per-day coverage, and today's shift list. Always reads
 * live data (never fixtures).
 */
export async function dashboardStats(_req: Request, res: Response): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  await ensureSeeded(userId)

  const lookups = await buildLookups(userId)
  const weekStart = weekStartOf()
  const weekEndDate = new Date(`${weekStart}T00:00:00Z`)
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7)
  const inCurrentWeek = (s: { starts_at: string }): boolean => {
    const start = new Date(s.starts_at)
    return start >= new Date(`${weekStart}T00:00:00Z`) && start < weekEndDate
  }

  const activeStaff = lookups.decoratedStaff.filter((s) => s.status === 'active')
  const weekShifts = lookups.rawShifts.filter(inCurrentWeek)
  const assignedWeekShifts = weekShifts.filter((s) => s.staff_id != null)
  const openWeekShifts = weekShifts.filter((s) => s.staff_id == null && s.published)

  const hoursThisWeek =
    Math.round(assignedWeekShifts.reduce((sum, s) => sum + shiftHours(s), 0) * 100) / 100
  const maxHoursBudget = activeStaff.reduce((sum, s) => sum + s.max_weekly_hours, 0)

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const coverageByDay = DAY_LABELS.map((label, i) => {
    const dayStart = new Date(`${weekStart}T00:00:00Z`)
    dayStart.setUTCDate(dayStart.getUTCDate() + i)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
    const dayShifts = weekShifts.filter((s) => {
      const start = new Date(s.starts_at)
      return start >= dayStart && start < dayEnd
    })
    return {
      label,
      date: dayStart.toISOString().slice(0, 10),
      shifts: dayShifts.length,
      open: dayShifts.filter((s) => s.staff_id == null && s.published).length,
      hours: Math.round(dayShifts.reduce((sum, s) => sum + shiftHours(s), 0) * 10) / 10,
    }
  })

  // Pending approvals live in their own tables — counted here so the
  // dashboard needs no second round trip.
  const [pendingSwaps, pendingClaims] = await Promise.all([
    findMany<{ id: string }>('swap_requests', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'pending' },
      ],
    }),
    findMany<{ id: string }>('claims', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'pending' },
      ],
    }),
  ])

  const todayIso = new Date().toISOString().slice(0, 10)
  const todayShifts: DecoratedShift[] = lookups.rawShifts
    .filter((s) => new Date(s.starts_at).toISOString().slice(0, 10) === todayIso)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 8)
    .map(lookups.decorateShiftWithAvailability)

  res.json({
    week_start: weekStart,
    staff_total: lookups.decoratedStaff.length,
    active_staff: activeStaff.length,
    open_shifts: openWeekShifts.length,
    pending_swap_requests: pendingSwaps.length,
    pending_claims: pendingClaims.length,
    pending_approvals: pendingSwaps.length + pendingClaims.length,
    hours_scheduled: hoursThisWeek,
    max_hours_budget: maxHoursBudget,
    coverage_by_day: coverageByDay,
    today_shifts: todayShifts,
  })
}

export default dashboardStats
