/**
 * Dose log handlers — generated dose schedule rows + take/skip/snooze actions.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const statusEnum = z.enum(['pending', 'scheduled', 'taken', 'skipped', 'missed', 'snoozed'])

const PILL_COLORS = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow'] as const
type PillColor = (typeof PILL_COLORS)[number]
const isPillColor = (v: unknown): v is PillColor =>
  typeof v === 'string' && (PILL_COLORS as readonly string[]).includes(v)

/**
 * Normalize the `scheduled_date` value (which Postgres returns as a
 * local-midnight JS Date) back to the canonical YYYY-MM-DD string
 * representing the actual stored calendar day. Returns the raw value
 * unchanged for non-Date inputs.
 */
const normalizeScheduledDate = (raw: unknown): string => {
  if (raw instanceof Date) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof raw === 'string') return raw.slice(0, 10)
  return ''
}

/**
 * Frontend Dose interface uses union 'taken' | 'missed' | 'upcoming' | 'skipped'.
 * Map backend statuses (pending, scheduled, snoozed) into 'upcoming'.
 */
const projectDose = (
  dose: Record<string, unknown>,
  med?: Record<string, unknown>,
): Record<string, unknown> => {
  const rawStatus = String(dose.status ?? 'pending')
  const status =
    rawStatus === 'taken' || rawStatus === 'skipped' || rawStatus === 'missed'
      ? rawStatus
      : 'upcoming'
  const pillColor: PillColor = med
    ? isPillColor(med.pill_color)
      ? med.pill_color
      : isPillColor(med.color)
        ? med.color
        : 'blue'
    : 'blue'
  return {
    ...dose,
    scheduled_date: normalizeScheduledDate(dose.scheduled_date),
    status,
    medication_name: med?.name ?? '',
    pill_color: pillColor,
    dose_amount: med?.dosage ?? '',
  }
}

/**
 * Bulk-load every medication referenced by `doses` keyed by id.
 */
const loadMedsByDoses = async (
  userId: string,
  doses: Array<Record<string, unknown>>,
): Promise<Map<string, Record<string, unknown>>> => {
  const ids = Array.from(new Set(doses.map((d) => String(d.medication_id))))
  if (ids.length === 0) return new Map()
  const meds = (await findMany('medications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'id', operator: 'in', value: ids },
    ],
  })) as Array<Record<string, unknown>>
  const map = new Map<string, Record<string, unknown>>()
  for (const m of meds) map.set(String(m.id), m)
  return map
}

const createDoseSchema = z.object({
  medication_id: z.string().min(1),
  schedule_id: z.string().nullable().optional(),
  scheduled_at: z.string().min(1),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  status: statusEnum.optional(),
  notes: z.string().max(2000).optional(),
})

const updateDoseSchema = z.object({
  status: statusEnum.optional(),
  taken_at: z.string().nullable().optional(),
  snooze_until: z.string().nullable().optional(),
  skip_reason: z.string().max(255).nullable().optional(),
  notes: z.string().max(2000).optional(),
})

const listQuerySchema = z.object({
  filter: z.enum(['today', 'week']).optional(),
  medication_id: z.string().optional(),
  date: z.string().optional(),
  status: statusEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const todayStr = (): string => new Date().toISOString().slice(0, 10)

const dateOffsetStr = (offsetDays: number): string => {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

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
    const { filter, medication_id, date, status, from, to, limit, offset } = req.query as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (medication_id)
      where.push({ field: 'medication_id', operator: '=', value: String(medication_id) })
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (date) where.push({ field: 'scheduled_date', operator: '=', value: String(date) })
    if (filter === 'today')
      where.push({ field: 'scheduled_date', operator: '=', value: todayStr() })
    if (filter === 'week') {
      where.push({ field: 'scheduled_date', operator: '>=', value: todayStr() })
      where.push({ field: 'scheduled_date', operator: '<=', value: dateOffsetStr(6) })
    }
    if (from) where.push({ field: 'scheduled_at', operator: '>=', value: String(from) })
    if (to) where.push({ field: 'scheduled_at', operator: '<=', value: String(to) })
    const orderBy: OrderBy[] = [{ field: 'scheduled_at', direction: 'asc' }]
    const doses = (await findMany('dose_logs', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })) as Array<Record<string, unknown>>
    const meds = await loadMedsByDoses(userId, doses)
    res.json(doses.map((d) => projectDose(d, meds.get(String(d.medication_id)))))
  },
)

router.get('/today', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const doses = (await findMany('dose_logs', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'scheduled_date', operator: '=', value: todayStr() },
    ],
    orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
  })) as Array<Record<string, unknown>>
  const meds = await loadMedsByDoses(userId, doses)
  res.json(doses.map((d) => projectDose(d, meds.get(String(d.medication_id)))))
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
    const dose = await findById<Record<string, unknown>>('dose_logs', idOf(req))
    if (!dose || dose.user_id !== userId) {
      res.status(404).json({
        error: t('doses.notFound', undefined, { defaultValue: 'Dose log not found.' }),
      })
      return
    }
    const med = await findById<Record<string, unknown>>('medications', String(dose.medication_id))
    res.json(projectDose(dose, med ?? undefined))
  },
)

// `enforceMaxDoses` was historically applied to manual POST /doses, but
// every medication automatically materializes one dose_log per scheduled
// time × N days, which makes a low free-tier maxDoses cap functionally
// block adding the FIRST medication. Doses are an internal artifact, not
// a user-facing inventory. The user-facing caps live on medications,
// schedules, and refills (still enforced at their own POST routes).
router.post(
  '/',
  validateBody(createDoseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createDoseSchema>
    // Verify the parent medication belongs to this user.
    const med = await findById<Record<string, unknown>>('medications', body.medication_id)
    if (!med || med.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const at = new Date(body.scheduled_at)
    const result = await create('dose_logs', {
      schedule_id: body.schedule_id ?? null,
      medication_id: body.medication_id,
      user_id: userId,
      scheduled_at: at.toISOString(),
      scheduled_date: body.scheduled_date ?? at.toISOString().slice(0, 10),
      scheduled_time: body.scheduled_time ?? at.toISOString().slice(11, 16),
      status: body.status ?? 'pending',
      notes: body.notes ?? '',
      created_at: new Date(),
    })
    res.status(201).json(projectDose(result.data as Record<string, unknown>, med))
  },
)

router.post(
  '/:id/take',
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
    const dose = await findById<Record<string, unknown>>('dose_logs', id)
    if (!dose || dose.user_id !== userId) {
      res.status(404).json({
        error: t('doses.notFound', undefined, { defaultValue: 'Dose log not found.' }),
      })
      return
    }
    const result = await updateById('dose_logs', id, {
      status: 'taken',
      taken_at: new Date(),
      snooze_until: null,
    })
    const med = await findById<Record<string, unknown>>('medications', String(dose.medication_id))
    res.json(projectDose(result.data as Record<string, unknown>, med ?? undefined))
  },
)

router.post(
  '/:id/skip',
  validateParams(idParamSchema),
  validateBody(z.object({ reason: z.string().max(255).optional() })),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const dose = await findById<Record<string, unknown>>('dose_logs', id)
    if (!dose || dose.user_id !== userId) {
      res.status(404).json({
        error: t('doses.notFound', undefined, { defaultValue: 'Dose log not found.' }),
      })
      return
    }
    const reason = (req.body as { reason?: string })?.reason ?? ''
    const result = await updateById('dose_logs', id, {
      status: 'skipped',
      skip_reason: reason,
      taken_at: new Date(),
    })
    const med = await findById<Record<string, unknown>>('medications', String(dose.medication_id))
    res.json(projectDose(result.data as Record<string, unknown>, med ?? undefined))
  },
)

router.post(
  '/:id/snooze',
  validateParams(idParamSchema),
  validateBody(z.object({ minutes: z.number().int().min(1).max(720).optional() })),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const dose = await findById<Record<string, unknown>>('dose_logs', id)
    if (!dose || dose.user_id !== userId) {
      res.status(404).json({
        error: t('doses.notFound', undefined, { defaultValue: 'Dose log not found.' }),
      })
      return
    }
    const minutes = (req.body as { minutes?: number })?.minutes ?? 15
    const next = new Date(Date.now() + minutes * 60_000)
    const result = await updateById('dose_logs', id, {
      status: 'snoozed',
      snooze_until: next,
    })
    const med = await findById<Record<string, unknown>>('medications', String(dose.medication_id))
    res.json(projectDose(result.data as Record<string, unknown>, med ?? undefined))
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDoseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const dose = await findById<Record<string, unknown>>('dose_logs', id)
    if (!dose || dose.user_id !== userId) {
      res.status(404).json({
        error: t('doses.notFound', undefined, { defaultValue: 'Dose log not found.' }),
      })
      return
    }
    const result = await updateById('dose_logs', id, req.body as Record<string, unknown>)
    const med = await findById<Record<string, unknown>>('medications', String(dose.medication_id))
    res.json(projectDose(result.data as Record<string, unknown>, med ?? undefined))
  },
)

export default router
