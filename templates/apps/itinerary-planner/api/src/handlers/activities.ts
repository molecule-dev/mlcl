import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { ItineraryPlannerLimits } from '../tiers.js'
import { userCanEditTrip } from './_authz.js'

const router = Router()

const createActivitySchema = z.object({
  trip_id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(['sightseeing', 'food', 'transport', 'rest']).optional(),
  day_index: z.number().int().nonnegative().optional(),
  position: z.number().int().nonnegative().optional(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  location_name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  cost_cents: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
})

// [L2-1] Omit the parent FK from updates: `.partial()` would let an update body reassign
// `trip_id` to another user's trip (only the create path checks ownership), attaching this
// activity to a victim's trip. Reparenting is not supported here, so drop it entirely.
const updateActivitySchema = createActivitySchema.omit({ trip_id: true }).partial()

const reorderActivitySchema = z.object({
  sort_order: z.number().int().nonnegative().optional(),
  position: z.number().int().nonnegative().optional(),
  day_index: z.number().int().nonnegative().optional(),
  date: z.string().optional(),
  start_time: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (req.query.trip_id) {
      where.push({ field: 'trip_id', operator: '=', value: String(req.query.trip_id) })
    }
    const activities = await findMany('activities', {
      where,
      orderBy: [
        { field: 'day_index', direction: 'asc' },
        { field: 'position', direction: 'asc' },
      ],
    })
    res.json(activities)
  } catch (error) {
    logger.error('activities.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const activity = await findById<Record<string, unknown>>('activities', id)
    if (!activity || activity.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('activity.notFound', undefined, { defaultValue: 'Activity not found.' }) })
    }
    res.json(activity)
  } catch (error) {
    logger.error('activities.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<ItineraryPlannerLimits>({
    limitType: 'maxActivities',
    getLimit: (limits) => limits.maxActivities,
    getCurrent: async (userId) =>
      count('activities', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createActivitySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const data = req.body as z.infer<typeof createActivitySchema>
      if (!(await userCanEditTrip(data.trip_id, userId))) {
        return res
          .status(404)
          .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
      }
      const result = await create('activities', {
        user_id: userId,
        trip_id: data.trip_id,
        title: data.title,
        kind: data.kind ?? 'sightseeing',
        day_index: data.day_index ?? 0,
        position: data.position ?? 0,
        sort_order: data.position ?? 0,
        date: data.date ?? null,
        start_time: data.start_time ?? null,
        starts_at: data.starts_at ?? null,
        ends_at: data.ends_at ?? null,
        location_name: data.location_name ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
        cost_cents: data.cost_cents ?? 0,
        currency: data.currency ?? 'USD',
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('activities.ts', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateActivitySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('activities', id)
    if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
      return res
        .status(404)
        .json({ error: t('activity.notFound', undefined, { defaultValue: 'Activity not found.' }) })
    }
    const result = await updateById('activities', id, { ...req.body, updated_at: new Date() })
    res.json(result.data)
  } catch (error) {
    logger.error('activities.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.put(
  '/:id/reorder',
  validateBody(reorderActivitySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('activities', id)
      if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
        return res.status(404).json({
          error: t('activity.notFound', undefined, { defaultValue: 'Activity not found.' }),
        })
      }
      const data = req.body as z.infer<typeof reorderActivitySchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (data.position !== undefined) {
        updates.position = data.position
        updates.sort_order = data.position
      }
      if (data.sort_order !== undefined) updates.sort_order = data.sort_order
      if (data.day_index !== undefined) updates.day_index = data.day_index
      if (data.date !== undefined) updates.date = data.date
      if (data.start_time !== undefined) updates.start_time = data.start_time
      const result = await updateById('activities', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('activities.ts', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('activities', id)
    if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
      return res
        .status(404)
        .json({ error: t('activity.notFound', undefined, { defaultValue: 'Activity not found.' }) })
    }
    await deleteById('activities', id)
    res.status(204).end()
  } catch (error) {
    logger.error('activities.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
