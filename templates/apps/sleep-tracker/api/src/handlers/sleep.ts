/**
 * Sleep log CRUD handlers.
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

import type { SleepTrackerLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxSleep = enforceLimit<SleepTrackerLimits>({
  limitType: 'maxSleep',
  getLimit: (limits) => limits.maxSleep,
  getCurrent: async (userId) =>
    count('sleep_logs', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const sourceEnum = z.enum(['manual', 'apple_health', 'fitbit', 'oura', 'withings', 'google_fit'])

const sleepStagesSchema = z
  .object({
    deep: z.number().min(0).optional(),
    light: z.number().min(0).optional(),
    rem: z.number().min(0).optional(),
    awake: z.number().min(0).optional(),
  })
  .partial()

const createSleepSchema = z.object({
  sleep_date: z.string().min(1).optional(),
  bedtime: z.string().min(1),
  wake_time: z.string().min(1),
  duration_minutes: z.number().int().min(0).optional(),
  quality_score: z.number().int().min(0).max(100).nullable().optional(),
  efficiency_pct: z.number().min(0).max(100).nullable().optional(),
  interruptions: z.number().int().min(0).optional(),
  source: sourceEnum.default('manual'),
  notes: z.string().max(4000).optional(),
  factors: z.array(z.string().min(1).max(64)).max(50).optional(),
  sleep_stages: sleepStagesSchema.optional(),
})

const updateSleepSchema = createSleepSchema.partial()

const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
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

    const { from, to, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (from) where.push({ field: 'sleep_date', operator: '>=', value: from })
    if (to) where.push({ field: 'sleep_date', operator: '<=', value: to })

    const orderBy: OrderBy[] = [{ field: 'sleep_date', direction: 'desc' }]
    const logs = await findMany('sleep_logs', {
      where,
      orderBy,
      limit: limit ?? 30,
      offset: offset ?? 0,
    })
    res.json(logs)
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
    const log = await findById<Record<string, unknown>>('sleep_logs', idOf(req))
    if (!log || log.user_id !== userId) {
      res.status(404).json({
        error: t('sleep.notFound', undefined, { defaultValue: 'Sleep log not found.' }),
      })
      return
    }
    res.json(log)
  },
)

router.post(
  '/',
  enforceMaxSleep,
  validateBody(createSleepSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createSleepSchema>
    const bedDate = new Date(body.bedtime)
    const wakeDate = new Date(body.wake_time)
    const durationMinutes =
      body.duration_minutes ??
      Math.max(0, Math.round((wakeDate.getTime() - bedDate.getTime()) / 60000))
    const sleepDate = body.sleep_date ?? bedDate.toISOString().slice(0, 10)

    const result = await create('sleep_logs', {
      user_id: userId,
      sleep_date: sleepDate,
      bedtime: body.bedtime,
      wake_time: body.wake_time,
      duration_minutes: durationMinutes,
      quality_score: body.quality_score ?? null,
      efficiency_pct: body.efficiency_pct ?? null,
      interruptions: body.interruptions ?? 0,
      source: body.source,
      notes: body.notes ?? '',
      factors: JSON.stringify(body.factors ?? []),
      sleep_stages: JSON.stringify(body.sleep_stages ?? {}),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSleepSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('sleep_logs', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('sleep.notFound', undefined, { defaultValue: 'Sleep log not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.factors !== undefined) {
      incoming.factors = JSON.stringify(incoming.factors)
    }
    if (incoming.sleep_stages !== undefined) {
      incoming.sleep_stages = JSON.stringify(incoming.sleep_stages)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('sleep_logs', id, updates)
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSleepSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('sleep_logs', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('sleep.notFound', undefined, { defaultValue: 'Sleep log not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.factors !== undefined) {
      incoming.factors = JSON.stringify(incoming.factors)
    }
    if (incoming.sleep_stages !== undefined) {
      incoming.sleep_stages = JSON.stringify(incoming.sleep_stages)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('sleep_logs', id, updates)
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
    const existing = await findById<Record<string, unknown>>('sleep_logs', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('sleep.notFound', undefined, { defaultValue: 'Sleep log not found.' }),
      })
      return
    }
    await deleteMany('sleep_stages', [{ field: 'sleep_log_id', operator: '=', value: id }])
    await deleteMany('sleep_factors', [{ field: 'sleep_log_id', operator: '=', value: id }])
    await deleteMany('sleep_logs', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
