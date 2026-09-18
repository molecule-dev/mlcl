import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership, requireParentOwnership } from '../lib/authz.js'
import type { FleetManagementLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeRoute } from './_shape.js'

const router = Router()

const stopSchema = z.object({
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  estimated_arrival: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

const createRouteSchema = z.object({
  name: z.string().min(1).max(200),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  scheduled_date: z.string().optional(),
  origin: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  stops: z.array(stopSchema).max(100).optional(),
})

const updateRouteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  scheduled_date: z.string().optional(),
  origin: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'archived']).optional(),
})

router.use(authorizers.auth())

// List routes — owner-scoped. Seeds demo data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { status, driver_id, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (driver_id) where.push({ field: 'driver_id', operator: '=', value: String(driver_id) })

    const routes = await findMany('fleet_routes', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'scheduled_date', direction: 'desc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const allStops = await findMany('route_stops', {
      where: [],
      limit: 10000,
    })
    const stopCounts = new Map<string, { total: number; completed: number }>()
    for (const s of allStops as Array<Record<string, unknown>>) {
      const rid = String(s.route_id ?? '')
      if (!rid) continue
      const cur = stopCounts.get(rid) ?? { total: 0, completed: 0 }
      cur.total += 1
      if (s.status === 'completed') cur.completed += 1
      stopCounts.set(rid, cur)
    }
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(
      routes.map((r) =>
        shapeRoute(r as Record<string, unknown>, vehicleById, driverById, stopCounts),
      ),
    )
  } catch (err) {
    logger.error('[routes] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get route with stops — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('fleet_routes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('routes.notFound', {}, { defaultValue: 'Route not found' }),
      })
      return
    }

    const stops = await findMany('route_stops', {
      where: [{ field: 'route_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'sequence', direction: 'asc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const stopCounts = new Map<string, { total: number; completed: number }>()
    let total = 0
    let completed = 0
    for (const s of stops as Array<Record<string, unknown>>) {
      total += 1
      if (s.status === 'completed') completed += 1
    }
    stopCounts.set(req.params.id as string, { total, completed })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json({
      ...shapeRoute(check.row as Record<string, unknown>, vehicleById, driverById, stopCounts),
      stops,
    })
  } catch (err) {
    logger.error('[routes] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create route — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<FleetManagementLimits>({
    limitType: 'maxRoutes',
    getLimit: (limits) => limits.maxRoutes,
    getCurrent: async (userId) =>
      count('fleet_routes', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createRouteSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createRouteSchema>
      const now = new Date().toISOString()

      const result = await create('fleet_routes', {
        owner_id: userId,
        name: body.name,
        vehicle_id: body.vehicle_id ?? null,
        driver_id: body.driver_id ?? null,
        scheduled_date: body.scheduled_date ?? null,
        origin: body.origin ?? null,
        destination: body.destination ?? null,
        status: 'planned',
        total_distance: 0,
        planned_distance_km: 0,
        planned_duration_seconds: 0,
        created_at: now,
        updated_at: now,
      })

      const route = result.data as Record<string, unknown> | null

      if (route?.id && body.stops?.length) {
        for (let i = 0; i < body.stops.length; i++) {
          const stop = body.stops[i]
          if (!stop) continue
          await create('route_stops', {
            route_id: route.id,
            sequence: i + 1,
            address: stop.address ?? '',
            latitude: stop.latitude ?? null,
            longitude: stop.longitude ?? null,
            estimated_arrival: stop.estimated_arrival ?? null,
            notes: stop.notes ?? '',
            status: 'pending',
            created_at: now,
          })
        }
      }

      res.status(201).json(route)
    } catch (err) {
      logger.error('[routes] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update route — owner-only.
router.put('/:id', validateBody(updateRouteSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('fleet_routes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('routes.notFound', {}, { defaultValue: 'Route not found' }),
      })
      return
    }
    const result = await updateById('fleet_routes', req.params.id as string, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('[routes] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Start route — owner-only.
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('fleet_routes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('routes.notFound', {}, { defaultValue: 'Route not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('fleet_routes', req.params.id as string, {
      status: 'in_progress',
      started_at: now,
      updated_at: now,
    })
    res.json(result.data)
  } catch (err) {
    logger.error('[routes] start failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Complete a stop — owner-only via parent route.
router.post('/:id/stops/:stopId/complete', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireParentOwnership(
      'route_stops',
      req.params.stopId as string,
      'fleet_routes',
      'route_id',
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('routes.stopNotFound', {}, { defaultValue: 'Route stop not found' }),
      })
      return
    }
    const result = await updateById('route_stops', req.params.stopId as string, {
      status: 'completed',
      actual_arrival: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('[routes] complete-stop failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Complete route — owner-only.
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('fleet_routes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('routes.notFound', {}, { defaultValue: 'Route not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('fleet_routes', req.params.id as string, {
      status: 'completed',
      completed_at: now,
      updated_at: now,
    })
    res.json(result.data)
  } catch (err) {
    logger.error('[routes] complete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete route — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('fleet_routes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('routes.notFound', {}, { defaultValue: 'Route not found' }),
      })
      return
    }
    await deleteById('fleet_routes', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[routes] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
