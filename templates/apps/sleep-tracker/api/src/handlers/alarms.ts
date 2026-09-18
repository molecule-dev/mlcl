/**
 * Smart-alarm CRUD handlers.
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
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { SleepTrackerLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxAlarms = enforceLimit<SleepTrackerLimits>({
  limitType: 'maxAlarms',
  getLimit: (limits) => limits.maxAlarms,
  getCurrent: async (userId) =>
    count('sleep_alarms', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const daysOfWeekSchema = z.array(z.number().int().min(0).max(6)).max(7)
const timeSchema = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'invalid HH:MM time')

const createAlarmSchema = z.object({
  label: z.string().max(120).optional(),
  alarm_time: timeSchema,
  window_minutes: z.number().int().min(0).max(120).optional(),
  days_of_week: daysOfWeekSchema.optional(),
  sound: z.string().max(64).optional(),
  vibration_pattern: z.string().max(64).nullable().optional(),
  enabled: z.boolean().optional(),
})

const updateAlarmSchema = createAlarmSchema.partial()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'alarm_time', direction: 'asc' }]
  const alarms = await findMany('sleep_alarms', { where, orderBy, limit: 100, offset: 0 })
  res.json(alarms)
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
    const alarm = await findById<Record<string, unknown>>('sleep_alarms', idOf(req))
    if (!alarm || alarm.user_id !== userId) {
      res.status(404).json({
        error: t('alarms.notFound', undefined, { defaultValue: 'Alarm not found.' }),
      })
      return
    }
    res.json(alarm)
  },
)

router.post(
  '/',
  enforceMaxAlarms,
  validateBody(createAlarmSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createAlarmSchema>
    const result = await create('sleep_alarms', {
      user_id: userId,
      label: body.label ?? '',
      alarm_time: body.alarm_time,
      window_minutes: body.window_minutes ?? 30,
      days_of_week: JSON.stringify(body.days_of_week ?? [1, 2, 3, 4, 5]),
      sound: body.sound ?? 'gentle',
      vibration_pattern: body.vibration_pattern ?? null,
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
  validateBody(updateAlarmSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('sleep_alarms', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('alarms.notFound', undefined, { defaultValue: 'Alarm not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.days_of_week !== undefined) {
      incoming.days_of_week = JSON.stringify(incoming.days_of_week)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('sleep_alarms', id, updates)
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateAlarmSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('sleep_alarms', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('alarms.notFound', undefined, { defaultValue: 'Alarm not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.days_of_week !== undefined) {
      incoming.days_of_week = JSON.stringify(incoming.days_of_week)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('sleep_alarms', id, updates)
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
    const existing = await findById<Record<string, unknown>>('sleep_alarms', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('alarms.notFound', undefined, { defaultValue: 'Alarm not found.' }),
      })
      return
    }
    await deleteMany('sleep_alarms', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
