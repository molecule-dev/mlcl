/**
 * Medication CRUD handlers.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { MedicationReminderLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const SHAPE_VALUES = ['round', 'oval', 'capsule', 'square'] as const
type PillShape = (typeof SHAPE_VALUES)[number]
const isShape = (v: unknown): v is PillShape =>
  typeof v === 'string' && (SHAPE_VALUES as readonly string[]).includes(v)

const PILL_COLORS = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow'] as const
type PillColor = (typeof PILL_COLORS)[number]
const isPillColor = (v: unknown): v is PillColor =>
  typeof v === 'string' && (PILL_COLORS as readonly string[]).includes(v)

const parseWarnings = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map((w) => String(w))
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map((w) => String(w)) : []
    } catch (_error) {
      // Non-JSON string: fall back to empty warnings array
      return []
    }
  }
  return []
}

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

const computeRefillDue = (med: Record<string, unknown>): string | null => {
  const supplyRemaining = Number(med.supply_remaining ?? 0)
  if (!supplyRemaining || supplyRemaining < 0) return null
  // Use updated_at (or created_at fallback) as the "supply was last set" anchor.
  const anchor = med.updated_at ?? med.created_at
  const anchorDate = anchor ? new Date(anchor as string | Date) : new Date()
  if (Number.isNaN(anchorDate.getTime())) return null
  const due = addDays(anchorDate, supplyRemaining)
  return due.toISOString().slice(0, 10)
}

/**
 * Project a medication row into the shape the frontend expects.
 * Frontend wants: dose_amount, pill_color, pill_shape, count_remaining,
 * refill_due, prescriber, warnings (as array), schedule_summary.
 */
const projectMedication = (
  med: Record<string, unknown>,
  scheduleTimes?: string[],
): Record<string, unknown> => {
  const pillColor: PillColor = isPillColor(med.pill_color)
    ? med.pill_color
    : isPillColor(med.color)
      ? med.color
      : 'blue'
  const pillShape: PillShape = isShape(med.shape) ? med.shape : 'round'
  const supplyRemaining = Number(med.supply_remaining ?? 0)
  return {
    ...med,
    dose_amount: med.dosage ?? '',
    pill_color: pillColor,
    pill_shape: pillShape,
    count_remaining: supplyRemaining,
    refill_due: computeRefillDue(med),
    prescriber: med.prescriber ?? '',
    pharmacy: med.pharmacy ?? med.refill_pharmacy ?? '',
    rx_number: med.rx_number ?? '',
    refills_remaining: Number(med.refills_remaining ?? 0),
    warnings: parseWarnings(med.warnings),
    schedule_times: scheduleTimes ?? [],
  }
}

const enforceMaxMedications = enforceLimit<MedicationReminderLimits>({
  limitType: 'maxMedications',
  getLimit: (limits) => limits.maxMedications,
  getCurrent: async (userId) =>
    count('medications', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const pillColorEnum = z.enum(['blue', 'green', 'orange', 'purple', 'pink', 'yellow'])

const createMedicationSchema = z.object({
  name: z.string().min(1).max(255),
  generic_name: z.string().max(255).optional().nullable(),
  dosage: z.string().max(64).optional(),
  dose_amount: z.string().max(64).optional(),
  dosage_amount: z.number().nullable().optional(),
  dosage_unit: z.string().max(32).nullable().optional(),
  form: z.string().max(32).optional(),
  route: z.string().max(32).optional(),
  color: z.string().max(32).nullable().optional(),
  pill_color: pillColorEnum.nullable().optional(),
  shape: z.string().max(32).nullable().optional(),
  prescriber: z.string().max(255).nullable().optional(),
  pharmacy: z.string().max(255).nullable().optional(),
  rx_number: z.string().max(64).nullable().optional(),
  indication: z.string().max(255).nullable().optional(),
  instructions: z.string().max(4000).optional(),
  warnings: z.array(z.string().min(1).max(128)).max(20).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
  refills_total: z.number().int().min(0).optional(),
  refills_used: z.number().int().min(0).optional(),
  refills_remaining: z.number().int().min(0).optional(),
  refill_pharmacy: z.string().max(255).nullable().optional(),
  supply_days: z.number().int().min(0).max(3650).optional(),
  supply_remaining: z.number().int().min(0).max(3650).optional(),
  schedule_summary: z.string().max(255).optional(),
  schedule_times: z
    .array(z.string().regex(/^\d{2}:\d{2}$/))
    .max(12)
    .optional(),
  notes: z.string().max(4000).optional(),
})

/**
 * Extract HH:MM (24-hour) times from a free-form summary like
 * "Daily, 8:00am" or "8 AM and 8 PM". Returns an empty array if nothing
 * parses; callers should fall back to a sensible default.
 */
const parseScheduleTimes = (summary: string): string[] => {
  const out = new Set<string>()
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(summary)) !== null) {
    let hour = parseInt(m[1] ?? '', 10)
    const minute = parseInt(m[2] ?? '0', 10)
    const ampm = (m[3] ?? '').toLowerCase()
    if (Number.isNaN(hour) || hour < 0 || hour > 23) continue
    if (Number.isNaN(minute) || minute < 0 || minute > 59) continue
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    out.add(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }
  return Array.from(out).sort()
}

/**
 * After creating a medication, materialize a default schedule + the next
 * `daysAhead` days of pending dose_logs so the dashboard / schedule grid
 * actually has something to render. Times come from explicit
 * `body.schedule_times`, otherwise parsed out of `schedule_summary`,
 * otherwise the single default `08:00`.
 */
const createSchedulesAndDoses = async (
  med: Record<string, unknown>,
  body: { schedule_times?: string[]; schedule_summary?: string },
  daysAhead = 14,
): Promise<void> => {
  const explicit = (body.schedule_times ?? []).filter((t) => /^\d{2}:\d{2}$/.test(t))
  const parsed = body.schedule_summary ? parseScheduleTimes(body.schedule_summary) : []
  const times = explicit.length > 0 ? explicit : parsed.length > 0 ? parsed : ['08:00']
  const userId = String(med.user_id)
  const medId = String(med.id)
  const sched = await create('medication_schedules', {
    medication_id: medId,
    user_id: userId,
    frequency_kind: 'daily',
    time_of_day: times[0],
    times_of_day: JSON.stringify(times),
    days_of_week: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
    interval_days: 1,
    dose_quantity: 1,
    with_food: false,
    reminder_minutes_before: 5,
    start_date: null,
    end_date: null,
    is_paused: false,
    enabled: true,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const schedId = String((sched.data as Record<string, unknown>).id)
  // Anchor schedule generation on the server's UTC "today" so that
  // `scheduled_date` (a calendar-day string) lines up with the comparable
  // `new Date().toISOString().slice(0, 10)` used by reports/today and
  // /doses/today filters. Using local-midnight + toISOString shifts a day
  // east-of-UTC, leaving today's first dose dated yesterday in UTC.
  const utcToday = new Date()
  utcToday.setUTCHours(0, 0, 0, 0)
  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(utcToday)
    day.setUTCDate(day.getUTCDate() + dayOffset)
    const isoDate = day.toISOString().slice(0, 10)
    for (const time of times) {
      const [hh, mm] = time.split(':').map((s) => parseInt(s, 10))
      const at = new Date(day)
      at.setUTCHours(hh ?? 0, mm ?? 0, 0, 0)
      await create('dose_logs', {
        schedule_id: schedId,
        medication_id: medId,
        user_id: userId,
        scheduled_at: at,
        scheduled_date: isoDate,
        scheduled_time: time,
        status: 'pending',
        notes: '',
        created_at: new Date(),
      })
    }
  }
}

const updateMedicationSchema = createMedicationSchema.partial()

/**
 * Read back the canonical, deduped schedule_times for a medication (joining
 * the dedicated `medication_schedules` rows). Used after PATCH/PUT so the
 * response carries the same shape as GET /:id and the frontend never sees
 * an empty schedule_times right after editing a medication.
 */
const loadScheduleTimes = async (medicationId: string): Promise<string[]> => {
  const schedules = (await findMany('medication_schedules', {
    where: [{ field: 'medication_id', operator: '=', value: medicationId }],
  })) as Array<Record<string, unknown>>
  const set = new Set<string>()
  for (const s of schedules) {
    const tod = String(s.time_of_day ?? '')
    if (tod) set.add(tod)
    let arr: unknown = s.times_of_day
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr)
      } catch (_error) {
        // Non-JSON string: treat times_of_day as empty
        arr = []
      }
    }
    if (Array.isArray(arr)) for (const v of arr) if (v) set.add(String(v))
  }
  return Array.from(set).sort()
}

const listQuerySchema = z.object({
  status: z.string().optional(),
  is_active: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { status, is_active, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (is_active !== undefined) {
      const flag = typeof is_active === 'string' ? is_active === 'true' : is_active
      where.push({ field: 'is_active', operator: '=', value: flag })
    }
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const meds = (await findMany('medications', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })) as Array<Record<string, unknown>>
    if (meds.length === 0) {
      res.json([])
      return
    }
    // Bulk-fetch schedules for all of the user's medications in one round-trip.
    const schedules = (await findMany('medication_schedules', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        {
          field: 'medication_id',
          operator: 'in',
          value: meds.map((m) => String(m.id)),
        },
      ],
    })) as Array<Record<string, unknown>>
    const timesByMed = new Map<string, Set<string>>()
    for (const s of schedules) {
      const key = String(s.medication_id)
      const set = timesByMed.get(key) ?? new Set<string>()
      const tod = String(s.time_of_day ?? '')
      if (tod) set.add(tod)
      let arr: unknown = s.times_of_day
      if (typeof arr === 'string') {
        try {
          arr = JSON.parse(arr)
        } catch (_error) {
          // Non-JSON string: treat times_of_day as empty
          arr = []
        }
      }
      if (Array.isArray(arr)) for (const v of arr) if (v) set.add(String(v))
      timesByMed.set(key, set)
    }
    res.json(
      meds.map((m) => projectMedication(m, Array.from(timesByMed.get(String(m.id)) ?? []).sort())),
    )
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const med = await findById<Record<string, unknown>>('medications', idOf(req))
    if (!med || med.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const schedules = (await findMany('medication_schedules', {
      where: [{ field: 'medication_id', operator: '=', value: String(med.id) }],
    })) as Array<Record<string, unknown>>
    const timeSet = new Set<string>()
    for (const s of schedules) {
      const tod = String(s.time_of_day ?? '')
      if (tod) timeSet.add(tod)
      let arr: unknown = s.times_of_day
      if (typeof arr === 'string') {
        try {
          arr = JSON.parse(arr)
        } catch (_error) {
          // Non-JSON string: treat times_of_day as empty
          arr = []
        }
      }
      if (Array.isArray(arr)) for (const v of arr) if (v) timeSet.add(String(v))
    }
    res.json(projectMedication(med, Array.from(timeSet).sort()))
  },
)

router.post(
  '/',
  enforceMaxMedications,
  validateBody(createMedicationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createMedicationSchema>
    const result = await create('medications', {
      user_id: userId,
      name: body.name,
      generic_name: body.generic_name ?? null,
      dosage: body.dosage ?? body.dose_amount ?? '',
      dosage_amount: body.dosage_amount ?? null,
      dosage_unit: body.dosage_unit ?? null,
      form: body.form ?? 'tablet',
      route: body.route ?? 'oral',
      color: body.color ?? body.pill_color ?? null,
      pill_color: body.pill_color ?? null,
      shape: body.shape ?? null,
      prescriber: body.prescriber ?? null,
      pharmacy: body.pharmacy ?? null,
      rx_number: body.rx_number ?? null,
      indication: body.indication ?? null,
      instructions: body.instructions ?? '',
      warnings: JSON.stringify(body.warnings ?? []),
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      is_active: body.is_active ?? true,
      status: body.status ?? 'active',
      refills_total: body.refills_total ?? 0,
      refills_used: body.refills_used ?? 0,
      refills_remaining:
        body.refills_remaining ?? Math.max(0, (body.refills_total ?? 0) - (body.refills_used ?? 0)),
      refill_pharmacy: body.refill_pharmacy ?? null,
      supply_days: body.supply_days ?? 30,
      supply_remaining: body.supply_remaining ?? body.supply_days ?? 30,
      schedule_summary: body.schedule_summary ?? '',
      notes: body.notes ?? '',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const created = result.data as Record<string, unknown>
    const explicit = (body.schedule_times ?? []).filter((time) => /^\d{2}:\d{2}$/.test(time))
    const parsed = body.schedule_summary ? parseScheduleTimes(body.schedule_summary) : []
    const finalTimes = explicit.length > 0 ? explicit : parsed.length > 0 ? parsed : ['08:00']
    await createSchedulesAndDoses(created, {
      schedule_times: finalTimes,
      schedule_summary: body.schedule_summary,
    })
    res.status(201).json(projectMedication(created, finalTimes))
  },
)

/**
 * Normalize an incoming PATCH/PUT body so it matches the actual DB columns.
 * The Zod schema accepts a few aliases (`dose_amount` -> `dosage`) for
 * compatibility with the frontend; this strips them out and folds them
 * into their canonical column names. Without this the SQL UPDATE
 * fails with `column "dose_amount" of relation "medications" does not exist`.
 */
const normalizeMedicationUpdate = (raw: Record<string, unknown>): Record<string, unknown> => {
  const incoming = { ...raw }
  if (incoming.dose_amount !== undefined) {
    if (incoming.dosage === undefined) incoming.dosage = incoming.dose_amount
    delete incoming.dose_amount
  }
  if (incoming.warnings !== undefined) {
    incoming.warnings = JSON.stringify(incoming.warnings)
  }
  delete incoming.schedule_times
  delete incoming.id
  delete incoming.user_id
  delete incoming.created_at
  return incoming
}

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateMedicationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('medications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const updates = {
      ...normalizeMedicationUpdate(req.body as Record<string, unknown>),
      updated_at: new Date(),
    }
    const result = await updateById('medications', id, updates)
    const times = await loadScheduleTimes(id)
    res.json(projectMedication(result.data as Record<string, unknown>, times))
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateMedicationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('medications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const updates = {
      ...normalizeMedicationUpdate(req.body as Record<string, unknown>),
      updated_at: new Date(),
    }
    const result = await updateById('medications', id, updates)
    const times = await loadScheduleTimes(id)
    res.json(projectMedication(result.data as Record<string, unknown>, times))
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('medications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    await deleteMany('medication_schedules', [{ field: 'medication_id', operator: '=', value: id }])
    await deleteMany('dose_logs', [{ field: 'medication_id', operator: '=', value: id }])
    await deleteMany('refill_requests', [{ field: 'medication_id', operator: '=', value: id }])
    await deleteMany('medications', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
