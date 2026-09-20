/**
 * Backend decoration helpers.
 *
 * The shift-scheduling UI is designed against view-ready shapes (e.g.
 * `staff_name`, `time_label`, `duration_hours`, `is_open`) rather than the
 * raw column shapes returned by `findMany`. The frontend stays simple and
 * presentational; the backend decorates every list/detail response with the
 * derived fields the UI expects.
 *
 * The pure helpers here (shiftsOverlap, combineShiftTimes, availabilityWarning,
 * weekStartOf) are the server-enforced conflict rules — they are unit-tested
 * in __tests__/shift-conflicts.test.ts and shared by every write path that
 * assigns a staff member to a shift (shift create/update, swap approval,
 * claim approval) so no path can double-book.
 *
 * @module
 */

import { findMany } from '@molecule/api-database'

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/**
 * Combine a calendar date (`YYYY-MM-DD`) and a wall-clock time (`HH:mm`)
 * into an ISO timestamp. An end time earlier than the start time rolls to
 * the next day (overnight/closing shifts) so `starts_at < ends_at` always
 * holds.
 */
export function combineShiftTimes(
  date: string,
  startTime: string,
  endTime: string,
): {
  starts_at: Date
  ends_at: Date
} {
  const [y, m, d] = date.split('-').map(Number)
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const starts = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, sh ?? 0, sm ?? 0))
  const ends = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, eh ?? 0, em ?? 0))
  if (ends.getTime() <= starts.getTime()) {
    ends.setUTCDate(ends.getUTCDate() + 1)
  }
  return { starts_at: starts, ends_at: ends }
}

/** True when two time ranges overlap (half-open intervals; touching edges do NOT conflict). */
export function shiftsOverlap(
  a: { starts_at: string | Date; ends_at: string | Date },
  b: { starts_at: string | Date; ends_at: string | Date },
): boolean {
  const aStart = new Date(a.starts_at).getTime()
  const aEnd = new Date(a.ends_at).getTime()
  const bStart = new Date(b.starts_at).getTime()
  const bEnd = new Date(b.ends_at).getTime()
  return aStart < bEnd && bStart < aEnd
}

/** Shift length in decimal hours. */
export function shiftHours(shift: { starts_at: string | Date; ends_at: string | Date }): number {
  const ms = new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()
  return Math.round((ms / (60 * 60 * 1000)) * 100) / 100
}

/** ISO `YYYY-MM-DD` date of the shift's start. */
export function shiftDate(shift: { starts_at: string | Date }): string {
  const d = new Date(shift.starts_at)
  return d.toISOString().slice(0, 10)
}

/** `HH:mm` clock time of a timestamp. */
export function clockOf(value: string | Date): string {
  const d = new Date(value)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** Monday-based week start (`YYYY-MM-DD`) for a date or ISO string. */
export function weekStartOf(value: string | Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : new Date(value)
  const day = d.getUTCDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diff)
  return monday.toISOString().slice(0, 10)
}

/** Add (or subtract) whole weeks from a `YYYY-MM-DD` week start. */
export function addWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Raw row shapes (as returned by the database bond)
// ---------------------------------------------------------------------------

export interface RawStaff {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
  max_weekly_hours: number | null
  status: string
  created_at: string
  updated_at: string
}

export interface RawShift {
  id: string
  user_id: string
  staff_id: string | null
  role: string
  starts_at: string
  ends_at: string
  published: boolean
  notes: string | null
  assigned_via: string
  created_at: string
  updated_at: string
}

export interface RawSwapRequest {
  id: string
  user_id: string
  kind: 'swap' | 'drop'
  from_shift: string
  requester_staff_id: string
  target_staff_id: string | null
  status: 'pending' | 'approved' | 'denied'
  note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface RawAvailability {
  id: string
  user_id: string
  staff_id: string
  weekday: number
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

export interface RawBlackoutDate {
  id: string
  user_id: string
  staff_id: string
  date: string
  reason: string | null
  created_at: string
  updated_at: string
}

export interface RawClaim {
  id: string
  user_id: string
  shift_id: string
  staff_id: string
  status: 'pending' | 'approved' | 'denied'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Decorated shapes (what the UI consumes)
// ---------------------------------------------------------------------------

export interface DecoratedStaff {
  id: string
  name: string
  first_name: string
  last_name: string
  avatar_initial: string
  email: string
  phone: string
  role: string
  max_weekly_hours: number
  status: string
}

export function decorateStaff(emp: RawStaff): DecoratedStaff {
  const name = `${emp.first_name} ${emp.last_name}`.trim()
  return {
    id: emp.id,
    name,
    first_name: emp.first_name,
    last_name: emp.last_name,
    avatar_initial: (emp.first_name?.[0] ?? '?').toUpperCase(),
    email: emp.email,
    phone: emp.phone ?? '',
    role: emp.role ?? 'general',
    max_weekly_hours: Number(emp.max_weekly_hours ?? 40),
    status: emp.status ?? 'active',
  }
}

/** Soft availability warning codes. The write path still allows the shift — it is flagged, not blocked. */
export type AvailabilityWarning = 'outside_availability' | 'blackout_date' | null

/**
 * Soft availability check for an assigned shift: does it fall inside the
 * staff member's recurring weekly windows, and is the date free of
 * black-outs? Returns a warning code (or null when the shift is fine).
 * A staff member with NO declared windows is treated as fully flexible —
 * no warning.
 */
export function availabilityWarning(
  shift: { starts_at: string | Date },
  windows: Array<{ weekday: number; start_time: string; end_time: string }>,
  blackoutDates: Array<{ date: string }>,
): AvailabilityWarning {
  const start = new Date(shift.starts_at)
  const date = start.toISOString().slice(0, 10)
  if (blackoutDates.some((b) => b.date === date)) return 'blackout_date'
  if (windows.length === 0) return null
  const weekday = start.getUTCDay()
  const startClock = clockOf(start)
  const covered = windows.some(
    (w) => w.weekday === weekday && w.start_time <= startClock && startClock < w.end_time,
  )
  return covered ? null : 'outside_availability'
}

export interface DecoratedShift {
  id: string
  staff_id: string | null
  staff_name: string
  staff_initial: string
  is_open: boolean
  role: string
  starts_at: string
  ends_at: string
  date: string
  start_time: string
  end_time: string
  time_label: string
  duration_hours: number
  published: boolean
  notes: string
  assigned_via: string
  availability_warning: AvailabilityWarning
}

export function decorateShift(
  shift: RawShift,
  ctx: {
    staffById: (id: string | null) => DecoratedStaff | null
    availability?: (staffId: string) => {
      windows: Array<{ weekday: number; start_time: string; end_time: string }>
      blackouts: Array<{ date: string }>
    }
  },
): DecoratedShift {
  const staff = ctx.staffById(shift.staff_id)
  const start = new Date(shift.starts_at)
  const end = new Date(shift.ends_at)
  const startTime = clockOf(start)
  const endTime = clockOf(end)
  let warning: AvailabilityWarning = null
  if (staff && ctx.availability) {
    const a = ctx.availability(staff.id)
    warning = availabilityWarning(shift, a.windows, a.blackouts)
  }
  return {
    id: shift.id,
    staff_id: shift.staff_id,
    staff_name: staff?.name ?? '',
    staff_initial: staff?.avatar_initial ?? '?',
    is_open: shift.staff_id == null,
    role: shift.role,
    starts_at: typeof shift.starts_at === 'string' ? shift.starts_at : start.toISOString(),
    ends_at: typeof shift.ends_at === 'string' ? shift.ends_at : end.toISOString(),
    date: start.toISOString().slice(0, 10),
    start_time: startTime,
    end_time: endTime,
    time_label: `${startTime}–${endTime}`,
    duration_hours: shiftHours(shift),
    published: Boolean(shift.published),
    notes: shift.notes ?? '',
    assigned_via: shift.assigned_via ?? 'assigned',
    availability_warning: warning,
  }
}

export interface DecoratedSwapRequest {
  id: string
  kind: 'swap' | 'drop'
  shift_id: string
  shift_role: string
  shift_date: string
  shift_time_label: string
  requester_id: string
  requester_name: string
  requester_initial: string
  target_id: string | null
  target_name: string
  status: 'pending' | 'approved' | 'denied'
  note: string
  submitted_at: string
  reviewed_at: string | null
}

export function decorateSwapRequest(
  swap: RawSwapRequest,
  ctx: {
    staffById: (id: string | null) => DecoratedStaff | null
    shiftById: (id: string) => RawShift | null
  },
): DecoratedSwapRequest {
  const requester = ctx.staffById(swap.requester_staff_id)
  const target = ctx.staffById(swap.target_staff_id)
  const shift = ctx.shiftById(swap.from_shift)
  return {
    id: swap.id,
    kind: swap.kind,
    shift_id: swap.from_shift,
    shift_role: shift?.role ?? '',
    shift_date: shift ? shiftDate(shift) : '',
    shift_time_label: shift ? `${clockOf(shift.starts_at)}–${clockOf(shift.ends_at)}` : '',
    requester_id: swap.requester_staff_id,
    requester_name: requester?.name ?? 'Unknown',
    requester_initial: requester?.avatar_initial ?? '?',
    target_id: swap.target_staff_id,
    target_name: target?.name ?? '',
    status: swap.status,
    note: swap.note ?? '',
    submitted_at:
      typeof swap.created_at === 'string'
        ? swap.created_at
        : new Date(swap.created_at).toISOString(),
    reviewed_at: swap.reviewed_at ?? null,
  }
}

export interface DecoratedClaim {
  id: string
  shift_id: string
  shift_role: string
  shift_date: string
  shift_time_label: string
  staff_id: string
  staff_name: string
  staff_initial: string
  status: 'pending' | 'approved' | 'denied'
  submitted_at: string
}

export function decorateClaim(
  claim: RawClaim,
  ctx: {
    staffById: (id: string | null) => DecoratedStaff | null
    shiftById: (id: string) => RawShift | null
  },
): DecoratedClaim {
  const staff = ctx.staffById(claim.staff_id)
  const shift = ctx.shiftById(claim.shift_id)
  return {
    id: claim.id,
    shift_id: claim.shift_id,
    shift_role: shift?.role ?? '',
    shift_date: shift ? shiftDate(shift) : '',
    shift_time_label: shift ? `${clockOf(shift.starts_at)}–${clockOf(shift.ends_at)}` : '',
    staff_id: claim.staff_id,
    staff_name: staff?.name ?? 'Unknown',
    staff_initial: staff?.avatar_initial ?? '?',
    status: claim.status,
    submitted_at:
      typeof claim.created_at === 'string'
        ? claim.created_at
        : new Date(claim.created_at).toISOString(),
  }
}

export interface DecoratedAvailabilityWindow {
  id: string
  staff_id: string
  staff_name: string
  staff_initial: string
  weekday: number
  start_time: string
  end_time: string
}

export interface DecoratedBlackoutDate {
  id: string
  staff_id: string
  staff_name: string
  staff_initial: string
  date: string
  reason: string
}

/**
 * Loads staff, shifts, swap requests, claims, availability windows and
 * blackout dates for a user once per request and returns lookup helpers
 * used by the decorate fns. Avoids N+1 lookups when decorating lists.
 */
export async function buildLookups(userId: string): Promise<{
  decoratedStaff: DecoratedStaff[]
  staffById: (id: string | null) => DecoratedStaff | null
  rawShifts: RawShift[]
  shiftById: (id: string) => RawShift | null
  availabilityOf: (staffId: string) => {
    windows: Array<{ weekday: number; start_time: string; end_time: string }>
    blackouts: Array<{ date: string }>
  }
  decorateShiftWithAvailability: (shift: RawShift) => DecoratedShift
}> {
  const [staffRows, shiftRows, windowRows, blackoutRows] = await Promise.all([
    findMany<RawStaff>('staff', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_name', direction: 'asc' }],
    }),
    findMany<RawShift>('shifts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'starts_at', direction: 'asc' }],
    }),
    findMany<RawAvailability>('availabilities', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findMany<RawBlackoutDate>('blackout_dates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
  ])

  const decoratedStaff = staffRows.map(decorateStaff)
  const staffByIdMap = new Map(decoratedStaff.map((s) => [String(s.id), s]))
  const staffById = (id: string | null): DecoratedStaff | null =>
    id ? (staffByIdMap.get(String(id)) ?? null) : null

  const shiftByIdMap = new Map(shiftRows.map((s) => [String(s.id), s]))
  const shiftById = (id: string): RawShift | null => shiftByIdMap.get(String(id)) ?? null

  const windowsByStaff = new Map<string, RawAvailability[]>()
  for (const w of windowRows) {
    const list = windowsByStaff.get(String(w.staff_id)) ?? []
    list.push(w)
    windowsByStaff.set(String(w.staff_id), list)
  }
  const blackoutsByStaff = new Map<string, RawBlackoutDate[]>()
  for (const b of blackoutRows) {
    const list = blackoutsByStaff.get(String(b.staff_id)) ?? []
    list.push(b)
    blackoutsByStaff.set(String(b.staff_id), list)
  }
  const availabilityOf = (
    staffId: string,
  ): {
    windows: Array<{ weekday: number; start_time: string; end_time: string }>
    blackouts: Array<{ date: string }>
  } => ({
    windows: (windowsByStaff.get(String(staffId)) ?? []).map((w) => ({
      weekday: Number(w.weekday),
      start_time: w.start_time,
      end_time: w.end_time,
    })),
    blackouts: (blackoutsByStaff.get(String(staffId)) ?? []).map((b) => ({ date: b.date })),
  })

  const decorateShiftWithAvailability = (shift: RawShift): DecoratedShift =>
    decorateShift(shift, { staffById, availability: availabilityOf })

  return {
    decoratedStaff,
    staffById,
    rawShifts: shiftRows,
    shiftById,
    availabilityOf,
    decorateShiftWithAvailability,
  }
}

/**
 * Find shifts for a staff member that overlap the given range. Used by
 * every assignment write path (shift create/update, swap approve, claim
 * approve) to enforce the no-double-booking rule.
 */
export async function findOverlappingShifts(
  userId: string,
  staffId: string,
  range: { starts_at: string | Date; ends_at: string | Date },
  excludeShiftId?: string,
): Promise<RawShift[]> {
  const rows = await findMany<RawShift>('shifts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'staff_id', operator: '=', value: staffId },
    ],
  })
  return rows.filter((r) => String(r.id) !== excludeShiftId && shiftsOverlap(r, range))
}
