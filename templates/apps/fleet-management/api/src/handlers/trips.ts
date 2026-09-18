import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership, requireParentOwnership } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeTrip } from './_shape.js'

const router = Router()

const createTripSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional(),
  started_at: z.string().optional(),
  start_latitude: z.number().min(-90).max(90).optional(),
  start_longitude: z.number().min(-180).max(180).optional(),
})

const updateTripSchema = z.object({
  ended_at: z.string().optional(),
  distance_km: z.number().min(0).optional(),
  duration_seconds: z.number().int().min(0).optional(),
  idle_seconds: z.number().int().min(0).optional(),
  fuel_used_liters: z.number().min(0).optional(),
  end_latitude: z.number().min(-90).max(90).optional(),
  end_longitude: z.number().min(-180).max(180).optional(),
})

const tripEventSchema = z.object({
  kind: z.enum(['start', 'stop', 'speeding', 'harsh_braking', 'geofence_enter', 'geofence_exit']),
  occurred_at: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { vehicle_id, driver_id, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (vehicle_id) where.push({ field: 'vehicle_id', operator: '=', value: String(vehicle_id) })
    if (driver_id) where.push({ field: 'driver_id', operator: '=', value: String(driver_id) })

    const trips = await findMany('trips', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'started_at', direction: 'desc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')

    // Count each trip's recorded events (harsh-braking, idle, incident, …) so the list's per-row
    // "Events" column + header badge reflect reality. shapeTrip hardcoded 0; one grouped query over
    // this page's trip ids fills it without an N+1.
    const tripIds = trips
      .map((tr) => String((tr as Record<string, unknown>).id ?? ''))
      .filter(Boolean)
    const eventCountById = new Map<string, number>()
    if (tripIds.length) {
      const tripEvents = await findMany('trip_events', {
        where: [{ field: 'trip_id', operator: 'in', value: tripIds }],
      })
      for (const ev of tripEvents as Array<Record<string, unknown>>) {
        const tid = String(ev.trip_id ?? '')
        if (tid) eventCountById.set(tid, (eventCountById.get(tid) ?? 0) + 1)
      }
    }

    res.json(
      trips.map((tr) =>
        shapeTrip(tr as Record<string, unknown>, vehicleById, driverById, eventCountById),
      ),
    )
  } catch (err) {
    logger.error('[trips] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('trips', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('trips.notFound', {}, { defaultValue: 'Trip not found' }),
      })
      return
    }
    const events = await findMany('trip_events', {
      where: [{ field: 'trip_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'occurred_at', direction: 'asc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json({
      ...shapeTrip(check.row as Record<string, unknown>, vehicleById, driverById),
      events,
    })
  } catch (err) {
    logger.error('[trips] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTripSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createTripSchema>

    const vehicleCheck = await requireOwnership('vehicles', body.vehicle_id, userId)
    if (!vehicleCheck.ok) {
      res.status(vehicleCheck.status).json({
        error: t('vehicles.notFound', {}, { defaultValue: 'Vehicle not found' }),
      })
      return
    }

    const now = new Date().toISOString()
    const result = await create('trips', {
      owner_id: userId,
      vehicle_id: body.vehicle_id,
      driver_id: body.driver_id ?? null,
      route_id: body.route_id ?? null,
      started_at: body.started_at ?? now,
      ended_at: null,
      distance_km: 0,
      duration_seconds: 0,
      idle_seconds: 0,
      fuel_used_liters: 0,
      start_latitude: body.start_latitude ?? null,
      start_longitude: body.start_longitude ?? null,
      created_at: now,
      updated_at: now,
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('[trips] create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', validateBody(updateTripSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('trips', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('trips.notFound', {}, { defaultValue: 'Trip not found' }),
      })
      return
    }
    const result = await updateById('trips', req.params.id as string, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('[trips] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/events', validateBody(tripEventSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('trips', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('trips.notFound', {}, { defaultValue: 'Trip not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof tripEventSchema>
    const result = await create('trip_events', {
      trip_id: req.params.id as string,
      kind: body.kind,
      occurred_at: body.occurred_at ?? new Date().toISOString(),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      payload: body.payload ? JSON.stringify(body.payload) : null,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('[trips] event create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/events/:eventId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireParentOwnership(
      'trip_events',
      req.params.eventId as string,
      'trips',
      'trip_id',
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('trips.eventNotFound', {}, { defaultValue: 'Trip event not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('[trips] event detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('trips', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('trips.notFound', {}, { defaultValue: 'Trip not found' }),
      })
      return
    }
    await deleteById('trips', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[trips] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
