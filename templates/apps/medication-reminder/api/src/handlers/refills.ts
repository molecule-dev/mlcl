/**
 * Refill request handlers — pending → in_transit → filled lifecycle, plus
 * a `/due` endpoint that surfaces low-supply medications.
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

import { dosingDaysPerWeek, parseDaysOfWeek } from '../lib/cadence.js'
import type { MedicationReminderLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxRefills = enforceLimit<MedicationReminderLimits>({
  limitType: 'maxRefills',
  getLimit: (limits) => limits.maxRefills,
  getCurrent: async (userId) =>
    count('refill_requests', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const statusEnum = z.enum(['requested', 'pending', 'in_transit', 'filled', 'cancelled'])

const createRefillSchema = z.object({
  medication_id: z.string().min(1),
  pharmacy: z.string().max(255).nullable().optional(),
  days_supply_remaining: z.number().int().min(0).max(3650).nullable().optional(),
  notes: z.string().max(2000).optional(),
  status: statusEnum.optional(),
})

const updateRefillSchema = z.object({
  status: statusEnum.optional(),
  pharmacy: z.string().max(255).nullable().optional(),
  contacted_at: z.string().nullable().optional(),
  filled_at: z.string().nullable().optional(),
  days_supply_remaining: z.number().int().min(0).max(3650).nullable().optional(),
  notes: z.string().max(2000).optional(),
})

const listQuerySchema = z.object({
  status: statusEnum.optional(),
  medication_id: z.string().optional(),
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
    const { status, medication_id, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (medication_id)
      where.push({ field: 'medication_id', operator: '=', value: String(medication_id) })
    const orderBy: OrderBy[] = [{ field: 'requested_at', direction: 'desc' }]
    const refills = await findMany('refill_requests', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    res.json(refills)
  },
)

router.get('/due', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const meds = await findMany('medications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ],
    orderBy: [{ field: 'supply_remaining', direction: 'asc' }],
  })
  const lowSupply = (meds as Array<Record<string, unknown>>).filter(
    (m) => Number(m.supply_remaining ?? 0) <= 7,
  )
  res.json(lowSupply)
})

const PILL_COLORS = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow'] as const
type PillColor = (typeof PILL_COLORS)[number]
const isPillColor = (v: unknown): v is PillColor =>
  typeof v === 'string' && (PILL_COLORS as readonly string[]).includes(v)

/** Parse a schedule's `times_of_day`, which the driver may return as a JSON string or an array. */
function parseTimesOfDay(raw: unknown): string[] {
  let v: unknown = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch (_error) {
      // Malformed stored JSON is treated as an empty list, the same as an absent value.
      return []
    }
  }
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/**
 * Refill alerts — one row per active medication, with a status bucket
 * (urgent / due_soon / requested / fine) computed from `supply_remaining`
 * and any pending refill_request rows. The Refills page consumes this
 * shape directly via `GET /api/refills` so a user clicking "Request"
 * actually persists a refill_request and the next render reflects it.
 */
router.get('/alerts', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const meds = (await findMany('medications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ],
    orderBy: [{ field: 'supply_remaining', direction: 'asc' }],
  })) as Array<Record<string, unknown>>
  if (meds.length === 0) {
    res.json([])
    return
  }
  const requests = (await findMany('refill_requests', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      {
        field: 'medication_id',
        operator: 'in',
        value: meds.map((m) => String(m.id)),
      },
    ],
  })) as Array<Record<string, unknown>>
  const pendingByMed = new Set<string>()
  for (const r of requests) {
    const status = String(r.status ?? '')
    if (status === 'requested' || status === 'pending' || status === 'in_transit') {
      pendingByMed.add(String(r.medication_id))
    }
  }
  // Per-day dose count, joined from each med's active schedules (batched — no N+1): the number of
  // scheduled times per day × dose_quantity. This was hardcoded to 1/day, so a med taken 3×/day
  // reported ~3× too many days of supply and slipped out of the urgent / due-soon buckets.
  const schedules = (await findMany('medication_schedules', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'medication_id', operator: 'in', value: meds.map((m) => String(m.id)) },
    ],
  })) as Array<Record<string, unknown>>
  // Per-med daily dose count (display) AND cadence-weighted average daily
  // consumption (supply projection). `daily_dose_count` stays the per-dosing-day
  // count; `days_remaining` accounts for how often the med is actually taken —
  // frequency_kind / days_of_week / interval_days were previously ignored, so a
  // Mon/Wed/Fri med reported ~7/3× too few days of supply and over-alerted.
  const dailyDoseByMed = new Map<string, number>()
  const avgConsumptionByMed = new Map<string, number>()
  for (const s of schedules) {
    if (s.enabled === false || s.is_paused === true) continue
    const frequencyKind = typeof s.frequency_kind === 'string' ? s.frequency_kind : 'daily'
    // Pro re nata (as-needed) meds have no fixed schedule — exclude them from
    // the runout projection rather than pretending a daily cadence.
    if (frequencyKind === 'as_needed') continue
    const perDosingDay =
      Math.max(1, parseTimesOfDay(s.times_of_day).length) *
      Math.max(1, Number(s.dose_quantity ?? 1))
    const cadenceFactor =
      dosingDaysPerWeek(
        frequencyKind,
        parseDaysOfWeek(s.days_of_week),
        Number(s.interval_days ?? 1),
      ) / 7
    const key = String(s.medication_id)
    dailyDoseByMed.set(key, (dailyDoseByMed.get(key) ?? 0) + perDosingDay)
    avgConsumptionByMed.set(key, (avgConsumptionByMed.get(key) ?? 0) + perDosingDay * cadenceFactor)
  }
  const alerts = meds.map((m) => {
    const supply = Number(m.supply_remaining ?? 0)
    const dailyDose = dailyDoseByMed.get(String(m.id)) ?? 1
    // Project runout on the cadence-weighted average consumption (falls back to
    // the per-dosing-day count when a med has no scheduled — non-PRN — doses).
    const avgConsumption = avgConsumptionByMed.get(String(m.id)) ?? dailyDose
    const days = Math.max(0, Math.floor(supply / avgConsumption))
    const pillColor: PillColor = isPillColor(m.pill_color)
      ? m.pill_color
      : isPillColor(m.color)
        ? m.color
        : 'blue'
    let status: 'urgent' | 'due_soon' | 'requested' | 'fine'
    if (pendingByMed.has(String(m.id))) status = 'requested'
    else if (days <= 7) status = 'urgent'
    else if (days <= 30) status = 'due_soon'
    else status = 'fine'
    const refillDue = (() => {
      if (!supply) return null
      const d = new Date()
      d.setUTCDate(d.getUTCDate() + days)
      return d.toISOString().slice(0, 10)
    })()
    return {
      id: String(m.id),
      medication_id: String(m.id),
      medication_name: String(m.name ?? ''),
      pill_color: pillColor,
      count_remaining: supply,
      daily_dose_count: dailyDose,
      days_remaining: days,
      refill_due: refillDue,
      refills_remaining: Number(m.refills_remaining ?? 0),
      pharmacy: String(m.pharmacy ?? m.refill_pharmacy ?? ''),
      pharmacy_phone: String(m.pharmacy_phone ?? ''),
      status,
    }
  })
  res.json(alerts)
})

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
    const refill = await findById<Record<string, unknown>>('refill_requests', idOf(req))
    if (!refill || refill.user_id !== userId) {
      res.status(404).json({
        error: t('refills.notFound', undefined, { defaultValue: 'Refill request not found.' }),
      })
      return
    }
    res.json(refill)
  },
)

router.post(
  '/',
  enforceMaxRefills,
  validateBody(createRefillSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createRefillSchema>
    const med = await findById<Record<string, unknown>>('medications', body.medication_id)
    if (!med || med.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const result = await create('refill_requests', {
      medication_id: body.medication_id,
      user_id: userId,
      pharmacy: body.pharmacy ?? (med.refill_pharmacy as string | null) ?? null,
      days_supply_remaining: body.days_supply_remaining ?? (med.supply_remaining as number) ?? null,
      status: body.status ?? 'requested',
      notes: body.notes ?? '',
      requested_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateRefillSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('refill_requests', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('refills.notFound', undefined, { defaultValue: 'Refill request not found.' }),
      })
      return
    }
    const result = await updateById('refill_requests', id, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateRefillSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('refill_requests', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('refills.notFound', undefined, { defaultValue: 'Refill request not found.' }),
      })
      return
    }
    const result = await updateById('refill_requests', id, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

/**
 * Mark the medication identified by `:id` as having a fresh "requested"
 * refill — creates a refill_request row tied to that medication. Used by
 * the Refills page's "Request" button (alerts use medication.id as their
 * primary key, so the URL is `/api/refills/${medication_id}/request`).
 */
router.post(
  '/:id/request',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const medicationId = idOf(req)
    const med = await findById<Record<string, unknown>>('medications', medicationId)
    if (!med || med.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const result = await create('refill_requests', {
      medication_id: medicationId,
      user_id: userId,
      pharmacy: (med.pharmacy as string | null) ?? (med.refill_pharmacy as string | null) ?? null,
      days_supply_remaining: (med.supply_remaining as number) ?? null,
      status: 'requested',
      notes: '',
      requested_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
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
    const existing = await findById<Record<string, unknown>>('refill_requests', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('refills.notFound', undefined, { defaultValue: 'Refill request not found.' }),
      })
      return
    }
    await deleteMany('refill_requests', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
