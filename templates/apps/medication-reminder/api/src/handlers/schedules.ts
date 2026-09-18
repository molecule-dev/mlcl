/**
 * Medication schedule CRUD handlers.
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

const enforceMaxSchedules = enforceLimit<MedicationReminderLimits>({
  limitType: 'maxSchedules',
  getLimit: (limits) => limits.maxSchedules,
  getCurrent: async (userId) =>
    count('medication_schedules', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const frequencyEnum = z.enum(['daily', 'weekly', 'x_per_day', 'cycle', 'as_needed'])

const createScheduleSchema = z.object({
  medication_id: z.string().min(1),
  frequency_kind: frequencyEnum.optional(),
  time_of_day: z.string().min(1),
  times_of_day: z.array(z.string()).max(24).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  interval_days: z.number().int().min(1).max(365).optional(),
  dose_quantity: z.number().min(0).optional(),
  with_food: z.boolean().optional(),
  reminder_minutes_before: z.number().int().min(0).max(1440).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_paused: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

const updateScheduleSchema = createScheduleSchema.partial()

const listQuerySchema = z.object({
  medication_id: z.string().optional(),
  is_paused: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
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
    const { medication_id, is_paused, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (medication_id)
      where.push({ field: 'medication_id', operator: '=', value: String(medication_id) })
    if (is_paused !== undefined) {
      const flag = typeof is_paused === 'string' ? is_paused === 'true' : is_paused
      where.push({ field: 'is_paused', operator: '=', value: flag })
    }
    const orderBy: OrderBy[] = [{ field: 'time_of_day', direction: 'asc' }]
    const schedules = await findMany('medication_schedules', {
      where,
      orderBy,
      limit: limit ?? 200,
      offset: offset ?? 0,
    })
    res.json(schedules)
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
    const sched = await findById<Record<string, unknown>>('medication_schedules', idOf(req))
    if (!sched || sched.user_id !== userId) {
      res.status(404).json({
        error: t('schedules.notFound', undefined, { defaultValue: 'Schedule not found.' }),
      })
      return
    }
    res.json(sched)
  },
)

router.post(
  '/',
  enforceMaxSchedules,
  validateBody(createScheduleSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createScheduleSchema>
    // Verify the parent medication belongs to this user (no schedule injection).
    const med = await findById<Record<string, unknown>>('medications', body.medication_id)
    if (!med || med.user_id !== userId) {
      res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
      return
    }
    const result = await create('medication_schedules', {
      medication_id: body.medication_id,
      user_id: userId,
      frequency_kind: body.frequency_kind ?? 'daily',
      time_of_day: body.time_of_day,
      times_of_day: JSON.stringify(body.times_of_day ?? [body.time_of_day]),
      days_of_week: JSON.stringify(body.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]),
      interval_days: body.interval_days ?? 1,
      dose_quantity: body.dose_quantity ?? 1,
      with_food: body.with_food ?? false,
      reminder_minutes_before: body.reminder_minutes_before ?? 5,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      is_paused: body.is_paused ?? false,
      enabled: body.enabled ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateScheduleSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('medication_schedules', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('schedules.notFound', undefined, { defaultValue: 'Schedule not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.times_of_day !== undefined) {
      incoming.times_of_day = JSON.stringify(incoming.times_of_day)
    }
    if (incoming.days_of_week !== undefined) {
      incoming.days_of_week = JSON.stringify(incoming.days_of_week)
    }
    const result = await updateById('medication_schedules', id, {
      ...incoming,
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateScheduleSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('medication_schedules', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('schedules.notFound', undefined, { defaultValue: 'Schedule not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.times_of_day !== undefined) {
      incoming.times_of_day = JSON.stringify(incoming.times_of_day)
    }
    if (incoming.days_of_week !== undefined) {
      incoming.days_of_week = JSON.stringify(incoming.days_of_week)
    }
    const result = await updateById('medication_schedules', id, {
      ...incoming,
      updated_at: new Date(),
    })
    res.json(result.data)
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
    const existing = await findById<Record<string, unknown>>('medication_schedules', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('schedules.notFound', undefined, { defaultValue: 'Schedule not found.' }),
      })
      return
    }
    await deleteMany('medication_schedules', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
