/**
 * Per-user demo seed for shift-scheduling.
 *
 * On a freshly signed-up user's first authenticated GET (e.g. /staff),
 * `seedDemoForUser` populates a small but realistic dataset so the
 * Dashboard, Schedule, Open shifts, Swap requests, Availability and
 * Timesheets pages all render with content immediately. Idempotent
 * on user_id — re-running is a no-op.
 *
 * Shift times are generated RELATIVE TO NOW (current week + next week,
 * Monday-based) so the demo roster is always around "today" no matter
 * when the user signs up.
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

import { addWeeks, combineShiftTimes, weekStartOf } from './_decorate.js'

interface StaffSeed {
  first_name: string
  last_name: string
  role: string
  email: string
  phone: string
  max_weekly_hours: number
  status: 'active' | 'inactive'
}

const STAFF: StaffSeed[] = [
  {
    first_name: 'Dana',
    last_name: 'Whitfield',
    role: 'Shift Lead',
    email: 'dana.whitfield@shiftly.example',
    phone: '+1 (415) 555-0111',
    max_weekly_hours: 40,
    status: 'active',
  },
  {
    first_name: 'Marcus',
    last_name: 'Oyelaran',
    role: 'Shift Lead',
    email: 'marcus.oyelaran@shiftly.example',
    phone: '+1 (415) 555-0112',
    max_weekly_hours: 40,
    status: 'active',
  },
  {
    first_name: 'Priya',
    last_name: 'Raman',
    role: 'Barista',
    email: 'priya.raman@shiftly.example',
    phone: '+1 (415) 555-0113',
    max_weekly_hours: 30,
    status: 'active',
  },
  {
    first_name: 'Tomás',
    last_name: 'Ibarra',
    role: 'Barista',
    email: 'tomas.ibarra@shiftly.example',
    phone: '+1 (415) 555-0114',
    max_weekly_hours: 25,
    status: 'active',
  },
  {
    first_name: 'Jules',
    last_name: 'Fontaine',
    role: 'Barista',
    email: 'jules.fontaine@shiftly.example',
    phone: '+1 (415) 555-0115',
    max_weekly_hours: 20,
    status: 'active',
  },
  {
    first_name: 'Kenji',
    last_name: 'Watanabe',
    role: 'Barista',
    email: 'kenji.watanabe@shiftly.example',
    phone: '+1 (415) 555-0116',
    max_weekly_hours: 35,
    status: 'active',
  },
  {
    first_name: 'Aaliyah',
    last_name: 'Brooks',
    role: 'Cashier',
    email: 'aaliyah.brooks@shiftly.example',
    phone: '+1 (415) 555-0117',
    max_weekly_hours: 25,
    status: 'active',
  },
  {
    first_name: 'Noah',
    last_name: 'Lindqvist',
    role: 'Cashier',
    email: 'noah.lindqvist@shiftly.example',
    phone: '+1 (415) 555-0118',
    max_weekly_hours: 20,
    status: 'active',
  },
  {
    first_name: 'Rosa',
    last_name: 'Delgado',
    role: 'Cook',
    email: 'rosa.delgado@shiftly.example',
    phone: '+1 (415) 555-0119',
    max_weekly_hours: 40,
    status: 'active',
  },
  {
    first_name: 'Emeka',
    last_name: 'Nwosu',
    role: 'Cook',
    email: 'emeka.nwosu@shiftly.example',
    phone: '+1 (415) 555-0120',
    max_weekly_hours: 35,
    status: 'active',
  },
  {
    first_name: 'Ha-eun',
    last_name: 'Seo',
    role: 'Barista',
    email: 'ha-eun.seo@shiftly.example',
    phone: '+1 (415) 555-0121',
    max_weekly_hours: 15,
    status: 'active',
  },
  {
    first_name: 'Owen',
    last_name: 'Tran',
    role: 'Barista',
    email: 'owen.tran@shiftly.example',
    phone: '+1 (415) 555-0122',
    max_weekly_hours: 20,
    status: 'inactive',
  },
]

/** [weekday (0=Sun), start, end] recurring availability windows per staff email. */
const AVAILABILITY: Record<string, Array<[number, string, string]>> = {
  'dana.whitfield@shiftly.example': [
    [1, '06:00', '16:00'],
    [2, '06:00', '16:00'],
    [3, '06:00', '16:00'],
    [4, '06:00', '16:00'],
    [5, '06:00', '14:00'],
  ],
  'marcus.oyelaran@shiftly.example': [
    [3, '12:00', '22:00'],
    [4, '12:00', '22:00'],
    [5, '12:00', '22:00'],
    [6, '08:00', '22:00'],
    [0, '08:00', '18:00'],
  ],
  'priya.raman@shiftly.example': [
    [1, '07:00', '15:00'],
    [2, '07:00', '15:00'],
    [4, '07:00', '15:00'],
    [5, '07:00', '13:00'],
    [6, '09:00', '17:00'],
  ],
  'tomas.ibarra@shiftly.example': [
    [2, '14:00', '22:00'],
    [4, '14:00', '22:00'],
    [5, '14:00', '22:00'],
    [6, '10:00', '20:00'],
  ],
  'jules.fontaine@shiftly.example': [
    [5, '14:00', '22:00'],
    [6, '09:00', '20:00'],
    [0, '09:00', '17:00'],
  ],
  'kenji.watanabe@shiftly.example': [
    [1, '06:00', '14:00'],
    [2, '06:00', '14:00'],
    [3, '06:00', '14:00'],
    [5, '06:00', '14:00'],
    [6, '06:00', '14:00'],
    [0, '06:00', '14:00'],
  ],
  'aaliyah.brooks@shiftly.example': [
    [1, '12:00', '20:00'],
    [3, '12:00', '20:00'],
    [5, '12:00', '20:00'],
    [6, '12:00', '20:00'],
  ],
  'noah.lindqvist@shiftly.example': [
    [4, '14:00', '22:00'],
    [5, '14:00', '22:00'],
    [6, '14:00', '22:00'],
  ],
  'rosa.delgado@shiftly.example': [
    [1, '07:00', '15:00'],
    [2, '07:00', '15:00'],
    [3, '07:00', '15:00'],
    [4, '07:00', '15:00'],
    [5, '07:00', '15:00'],
    [6, '08:00', '16:00'],
  ],
  'emeka.nwosu@shiftly.example': [
    [3, '12:00', '20:00'],
    [4, '12:00', '20:00'],
    [5, '12:00', '20:00'],
    [6, '10:00', '18:00'],
    [0, '10:00', '18:00'],
  ],
  'ha-eun.seo@shiftly.example': [
    [6, '09:00', '15:00'],
    [0, '09:00', '15:00'],
  ],
}

interface BlackoutSeed {
  email: string
  /** Days from today. */
  offsetDays: number
  reason: string
}

const BLACKOUTS: BlackoutSeed[] = [
  { email: 'jules.fontaine@shiftly.example', offsetDays: 9, reason: 'Family graduation.' },
  { email: 'aaliyah.brooks@shiftly.example', offsetDays: 12, reason: 'Wedding (out of town).' },
]

interface ShiftSeed {
  /** Staff email, or null for an open shift. */
  email: string | null
  role: string
  /** Week offset from the current (Monday-based) week: 0 = this week, 1 = next. */
  weekOffset: number
  /** Day offset inside that week (0 = Monday … 6 = Sunday). */
  day: number
  start: string
  end: string
  published: boolean
  notes?: string
}

const SHIFTS: ShiftSeed[] = [
  // --- current week (published) ---
  {
    email: 'dana.whitfield@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 0,
    day: 0,
    start: '06:00',
    end: '14:00',
    published: true,
  },
  {
    email: 'priya.raman@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 0,
    start: '07:00',
    end: '15:00',
    published: true,
  },
  {
    email: 'rosa.delgado@shiftly.example',
    role: 'Cook',
    weekOffset: 0,
    day: 0,
    start: '07:00',
    end: '15:00',
    published: true,
  },
  {
    email: 'kenji.watanabe@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 0,
    start: '10:00',
    end: '18:00',
    published: true,
  },
  {
    email: 'aaliyah.brooks@shiftly.example',
    role: 'Cashier',
    weekOffset: 0,
    day: 0,
    start: '12:00',
    end: '20:00',
    published: true,
  },
  {
    email: 'marcus.oyelaran@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 0,
    day: 1,
    start: '12:00',
    end: '20:00',
    published: true,
  },
  {
    email: 'tomas.ibarra@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 1,
    start: '14:00',
    end: '22:00',
    published: true,
  },
  {
    email: 'emeka.nwosu@shiftly.example',
    role: 'Cook',
    weekOffset: 0,
    day: 1,
    start: '12:00',
    end: '20:00',
    published: true,
  },
  {
    email: 'kenji.watanabe@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 1,
    start: '06:00',
    end: '14:00',
    published: true,
  },
  {
    email: 'dana.whitfield@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 0,
    day: 2,
    start: '06:00',
    end: '14:00',
    published: true,
  },
  {
    email: 'priya.raman@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 2,
    start: '07:00',
    end: '15:00',
    published: true,
  },
  {
    email: null,
    role: 'Barista',
    weekOffset: 0,
    day: 2,
    start: '14:00',
    end: '22:00',
    published: true,
    notes: 'Evening rush cover — open shift.',
  },
  {
    email: 'rosa.delgado@shiftly.example',
    role: 'Cook',
    weekOffset: 0,
    day: 2,
    start: '07:00',
    end: '15:00',
    published: true,
  },
  {
    email: 'aaliyah.brooks@shiftly.example',
    role: 'Cashier',
    weekOffset: 0,
    day: 3,
    start: '12:00',
    end: '20:00',
    published: true,
  },
  {
    email: 'marcus.oyelaran@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 0,
    day: 3,
    start: '12:00',
    end: '20:00',
    published: true,
  },
  {
    email: 'kenji.watanabe@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 3,
    start: '06:00',
    end: '14:00',
    published: true,
  },
  {
    email: 'noah.lindqvist@shiftly.example',
    role: 'Cashier',
    weekOffset: 0,
    day: 3,
    start: '14:00',
    end: '22:00',
    published: true,
  },
  {
    email: null,
    role: 'Cook',
    weekOffset: 0,
    day: 4,
    start: '12:00',
    end: '20:00',
    published: true,
    notes: 'Friday kitchen cover — open shift.',
  },
  {
    email: 'dana.whitfield@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 0,
    day: 4,
    start: '06:00',
    end: '14:00',
    published: true,
  },
  {
    email: 'tomas.ibarra@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 4,
    start: '14:00',
    end: '22:00',
    published: true,
  },
  {
    email: 'ha-eun.seo@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 5,
    start: '09:00',
    end: '15:00',
    published: true,
  },
  {
    email: 'marcus.oyelaran@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 0,
    day: 5,
    start: '08:00',
    end: '16:00',
    published: true,
  },
  {
    email: 'emeka.nwosu@shiftly.example',
    role: 'Cook',
    weekOffset: 0,
    day: 5,
    start: '10:00',
    end: '18:00',
    published: true,
  },
  {
    email: null,
    role: 'Barista',
    weekOffset: 0,
    day: 5,
    start: '15:00',
    end: '22:00',
    published: true,
    notes: 'Saturday afternoon — open shift.',
  },
  {
    email: 'jules.fontaine@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 6,
    start: '09:00',
    end: '17:00',
    published: true,
  },
  {
    email: 'ha-eun.seo@shiftly.example',
    role: 'Barista',
    weekOffset: 0,
    day: 6,
    start: '09:00',
    end: '15:00',
    published: true,
  },
  {
    email: 'emeka.nwosu@shiftly.example',
    role: 'Cook',
    weekOffset: 0,
    day: 6,
    start: '10:00',
    end: '18:00',
    published: true,
  },
  // --- next week (draft — not yet published) ---
  {
    email: 'dana.whitfield@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 1,
    day: 0,
    start: '06:00',
    end: '14:00',
    published: false,
  },
  {
    email: 'priya.raman@shiftly.example',
    role: 'Barista',
    weekOffset: 1,
    day: 0,
    start: '07:00',
    end: '15:00',
    published: false,
  },
  {
    email: 'rosa.delgado@shiftly.example',
    role: 'Cook',
    weekOffset: 1,
    day: 0,
    start: '07:00',
    end: '15:00',
    published: false,
  },
  {
    email: 'kenji.watanabe@shiftly.example',
    role: 'Barista',
    weekOffset: 1,
    day: 1,
    start: '06:00',
    end: '14:00',
    published: false,
  },
  {
    email: 'marcus.oyelaran@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 1,
    day: 1,
    start: '12:00',
    end: '20:00',
    published: false,
  },
  {
    email: 'tomas.ibarra@shiftly.example',
    role: 'Barista',
    weekOffset: 1,
    day: 2,
    start: '14:00',
    end: '22:00',
    published: false,
  },
  {
    email: null,
    role: 'Barista',
    weekOffset: 1,
    day: 2,
    start: '07:00',
    end: '15:00',
    published: false,
    notes: 'Pending someone — open shift.',
  },
  {
    email: 'aaliyah.brooks@shiftly.example',
    role: 'Cashier',
    weekOffset: 1,
    day: 3,
    start: '12:00',
    end: '20:00',
    published: false,
  },
  {
    email: 'noah.lindqvist@shiftly.example',
    role: 'Cashier',
    weekOffset: 1,
    day: 3,
    start: '14:00',
    end: '22:00',
    published: false,
  },
  {
    email: 'dana.whitfield@shiftly.example',
    role: 'Shift Lead',
    weekOffset: 1,
    day: 4,
    start: '06:00',
    end: '14:00',
    published: false,
  },
  {
    email: 'jules.fontaine@shiftly.example',
    role: 'Barista',
    weekOffset: 1,
    day: 5,
    start: '14:00',
    end: '22:00',
    published: false,
  },
  {
    email: 'ha-eun.seo@shiftly.example',
    role: 'Barista',
    weekOffset: 1,
    day: 5,
    start: '09:00',
    end: '15:00',
    published: false,
  },
  {
    email: null,
    role: 'Barista',
    weekOffset: 1,
    day: 6,
    start: '09:00',
    end: '17:00',
    published: false,
    notes: 'Sunday brunch — open shift.',
  },
]

interface SwapSeed {
  email: string
  kind: 'swap' | 'drop'
  /** Index into the created shifts array. */
  shiftIndex: number
  target_email: string | null
  status: 'pending' | 'approved' | 'denied'
  note: string
}

const SWAPS: SwapSeed[] = [
  {
    email: 'tomas.ibarra@shiftly.example',
    kind: 'drop',
    shiftIndex: 6,
    target_email: null,
    status: 'pending',
    note: 'Concert tickets that night — need the evening off.',
  },
  {
    email: 'aaliyah.brooks@shiftly.example',
    kind: 'swap',
    shiftIndex: 3,
    target_email: 'noah.lindqvist@shiftly.example',
    status: 'pending',
    note: 'Can you take my Monday register slot?',
  },
  {
    email: 'kenji.watanabe@shiftly.example',
    kind: 'swap',
    shiftIndex: 8,
    target_email: 'priya.raman@shiftly.example',
    status: 'approved',
    note: 'Swapped my Tuesday open for her Thursday.',
  },
]

interface ClaimSeed {
  /** Index into the created shifts array (must be an open shift). */
  shiftIndex: number
  email: string
  status: 'pending' | 'approved' | 'denied'
}

const CLAIMS: ClaimSeed[] = [
  { shiftIndex: 12, email: 'ha-eun.seo@shiftly.example', status: 'pending' },
]

function dateAtOffset(weekStart: string, weekOffset: number, day: number): string {
  const d = new Date(`${addWeeks(weekStart, weekOffset)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + day)
  return d.toISOString().slice(0, 10)
}

/**
 * Idempotently seed a freshly signed-up user with realistic scheduling demo
 * data. Returns a count summary; returns zeros if the user already has staff.
 */
export async function seedDemoForUser(userId: string): Promise<{
  staffCreated: number
  shiftsCreated: number
  swapsCreated: number
  claimsCreated: number
  windowsCreated: number
  blackoutsCreated: number
}> {
  const zeros = {
    staffCreated: 0,
    shiftsCreated: 0,
    swapsCreated: 0,
    claimsCreated: 0,
    windowsCreated: 0,
    blackoutsCreated: 0,
  }
  if (!userId) return zeros

  const existingStaff = await count('staff', [{ field: 'user_id', operator: '=', value: userId }])
  if (existingStaff > 0) return zeros

  const now = new Date()
  const weekStart = weekStartOf(now)

  // 1. Staff
  const staffIdByEmail = new Map<string, string>()
  for (const s of STAFF) {
    const created = await create<Record<string, unknown>>('staff', {
      user_id: userId,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      max_weekly_hours: s.max_weekly_hours,
      status: s.status,
      created_at: now,
      updated_at: now,
    })
    const row = (created.data ?? created) as Record<string, unknown>
    staffIdByEmail.set(s.email, String(row.id))
  }

  // 2. Availability windows
  let windowsCreated = 0
  for (const [email, windows] of Object.entries(AVAILABILITY)) {
    const staffId = staffIdByEmail.get(email)
    if (!staffId) continue
    for (const [weekday, start, end] of windows) {
      await create('availabilities', {
        user_id: userId,
        staff_id: staffId,
        weekday,
        start_time: start,
        end_time: end,
        created_at: now,
        updated_at: now,
      })
      windowsCreated++
    }
  }

  // 3. Blackout dates
  let blackoutsCreated = 0
  for (const b of BLACKOUTS) {
    const staffId = staffIdByEmail.get(b.email)
    if (!staffId) continue
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + b.offsetDays)
    await create('blackout_dates', {
      user_id: userId,
      staff_id: staffId,
      date: d.toISOString().slice(0, 10),
      reason: b.reason,
      created_at: now,
      updated_at: now,
    })
    blackoutsCreated++
  }

  // 4. Shifts (relative to the current week)
  const shiftIds: string[] = []
  for (const s of SHIFTS) {
    const date = dateAtOffset(weekStart, s.weekOffset, s.day)
    const { starts_at, ends_at } = combineShiftTimes(date, s.start, s.end)
    const created = await create<Record<string, unknown>>('shifts', {
      user_id: userId,
      staff_id: s.email ? (staffIdByEmail.get(s.email) ?? null) : null,
      role: s.role,
      starts_at,
      ends_at,
      published: s.published,
      notes: s.notes ?? null,
      assigned_via: 'assigned',
      created_at: now,
      updated_at: now,
    })
    const row = (created.data ?? created) as Record<string, unknown>
    shiftIds.push(String(row.id))
  }

  // 5. Swap requests
  let swapsCreated = 0
  for (const sw of SWAPS) {
    const requesterId = staffIdByEmail.get(sw.email)
    const shiftId = shiftIds[sw.shiftIndex]
    if (!requesterId || !shiftId) continue
    await create('swap_requests', {
      user_id: userId,
      kind: sw.kind,
      from_shift: shiftId,
      requester_staff_id: requesterId,
      target_staff_id: sw.target_email ? (staffIdByEmail.get(sw.target_email) ?? null) : null,
      status: sw.status,
      note: sw.note,
      reviewed_by: sw.status === 'approved' ? userId : null,
      reviewed_at: sw.status === 'approved' ? now : null,
      created_at: now,
      updated_at: now,
    })
    swapsCreated++
  }

  // 6. Open-shift claims
  let claimsCreated = 0
  for (const c of CLAIMS) {
    const staffId = staffIdByEmail.get(c.email)
    const shiftId = shiftIds[c.shiftIndex]
    if (!staffId || !shiftId) continue
    await create('claims', {
      user_id: userId,
      shift_id: shiftId,
      staff_id: staffId,
      status: c.status,
      reviewed_by: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    })
    claimsCreated++
  }

  return {
    staffCreated: STAFF.length,
    shiftsCreated: SHIFTS.length,
    swapsCreated,
    claimsCreated,
    windowsCreated,
    blackoutsCreated,
  }
}

/**
 * Lightweight idempotent seed wrapper used by every authenticated GET
 * route — runs the seed once per user, then becomes a no-op.
 *
 * Cached in-memory so we don't pay a count() for every request from a
 * user we've already seeded this process.
 */
const seededUserIds = new Set<string>()
const inFlight = new Map<string, Promise<void>>()

export async function ensureSeeded(userId: string | null | undefined): Promise<void> {
  if (!userId) return
  if (seededUserIds.has(userId)) return
  let p = inFlight.get(userId)
  if (!p) {
    p = (async () => {
      try {
        await seedDemoForUser(userId)
        seededUserIds.add(userId)
      } finally {
        inFlight.delete(userId)
      }
    })()
    inFlight.set(userId, p)
  }
  await p
}

export async function seedListUserIds(): Promise<string[]> {
  const rows = await findMany<{ user_id: string }>('staff', { limit: 1 })
  return rows.map((r) => String(r.user_id))
}
