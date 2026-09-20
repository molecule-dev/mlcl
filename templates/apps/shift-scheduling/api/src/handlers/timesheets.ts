import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'

import {
  buildLookups,
  type DecoratedStaff,
  shiftDate,
  shiftHours,
  weekStartOf,
} from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const querySchema = z.object({
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export interface TimesheetShiftRow {
  id: string
  date: string
  role: string
  time_label: string
  hours: number
  assigned_via: string
  published: boolean
  availability_warning: string | null
}

export interface TimesheetRow {
  staff_id: string
  staff_name: string
  staff_initial: string
  role: string
  max_weekly_hours: number
  scheduled_hours: number
  scheduled_shifts: number
  claimed_hours: number
  claimed_shifts: number
  total_hours: number
  shifts: TimesheetShiftRow[]
}

/**
 * Timesheets are DERIVED — never stored. For the requested week (default
 * the current one) every shift that has already ENDED counts toward the
 * staff member's totals, split into manager-scheduled vs
 * claimed/swapped-in so the payroll view shows how the week actually
 * got staffed. The CSV export is built client-side from this payload.
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const weekStart = parsed.data.week_start ?? weekStartOf()
  const lookups = await buildLookups(userId)
  const weekEnd = new Date(`${weekStart}T00:00:00Z`)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  const now = Date.now()

  const byStaff = new Map<string, TimesheetRow>()
  const rowFor = (staff: DecoratedStaff): TimesheetRow => {
    let row = byStaff.get(String(staff.id))
    if (!row) {
      row = {
        staff_id: staff.id,
        staff_name: staff.name,
        staff_initial: staff.avatar_initial,
        role: staff.role,
        max_weekly_hours: staff.max_weekly_hours,
        scheduled_hours: 0,
        scheduled_shifts: 0,
        claimed_hours: 0,
        claimed_shifts: 0,
        total_hours: 0,
        shifts: [],
      }
      byStaff.set(String(staff.id), row)
    }
    return row
  }

  const completed = lookups.rawShifts
    .filter((s) => s.staff_id != null)
    .filter((s) => {
      const start = new Date(s.starts_at)
      return start >= new Date(`${weekStart}T00:00:00Z`) && start < weekEnd
    })
    .filter((s) => new Date(s.ends_at).getTime() <= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  for (const raw of completed) {
    const staff = lookups.staffById(raw.staff_id)
    if (!staff) continue
    const decorated = lookups.decorateShiftWithAvailability(raw)
    const row = rowFor(staff)
    const hours = shiftHours(raw)
    const claimed = raw.assigned_via === 'claim' || raw.assigned_via === 'swap'
    if (claimed) {
      row.claimed_hours += hours
      row.claimed_shifts += 1
    } else {
      row.scheduled_hours += hours
      row.scheduled_shifts += 1
    }
    row.total_hours += hours
    row.shifts.push({
      id: decorated.id,
      date: shiftDate(raw),
      role: decorated.role,
      time_label: decorated.time_label,
      hours: decorated.duration_hours,
      assigned_via: decorated.assigned_via,
      published: decorated.published,
      availability_warning: decorated.availability_warning,
    })
  }

  const rows = [...byStaff.values()].sort((a, b) => a.staff_name.localeCompare(b.staff_name))
  res.json({
    week_start: weekStart,
    total_hours: Math.round(rows.reduce((sum, r) => sum + r.total_hours, 0) * 100) / 100,
    staff: rows,
  })
})

export default router
