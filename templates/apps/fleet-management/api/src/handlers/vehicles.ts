import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { FleetManagementLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeVehicle } from './_shape.js'

const router = Router()

const createVehicleSchema = z.object({
  plate: z.string().max(32).optional(),
  name: z.string().max(200).optional(),
  vin: z.string().max(64).optional(),
  license_plate: z.string().max(32).optional(),
  type: z.string().max(40).optional(),
  vehicle_type: z.string().max(40).optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  fuel_type: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'other']).optional(),
  mileage: z.number().int().min(0).optional(),
  odometer: z.number().int().min(0).optional(),
  assigned_driver_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  photo_url: z.string().url().max(2048).optional(),
  location: z.string().max(500).optional(),
})

const updateVehicleSchema = createVehicleSchema.extend({
  status: z.string().max(40).optional(),
  odometer_km: z.number().int().min(0).optional(),
  fuel_level_pct: z.number().int().min(0).max(100).optional(),
  fuel_pct: z.number().int().min(0).max(100).optional(),
})

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(500).optional(),
  heading: z.number().min(0).max(360).optional(),
})

router.use(authorizers.auth())

// List vehicles — owner-scoped. Seeds demo data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { status, type, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (type) where.push({ field: 'type', operator: '=', value: String(type) })

    const vehicles = await findMany('vehicles', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(vehicles.map((v) => shapeVehicle(v as Record<string, unknown>, driverById)))
  } catch (err) {
    logger.error('[vehicles] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get vehicle details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('vehicles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('vehicles.notFound', {}, { defaultValue: 'Vehicle not found' }),
      })
      return
    }
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(shapeVehicle(check.row as Record<string, unknown>, driverById))
  } catch (err) {
    logger.error('[vehicles] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create vehicle — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<FleetManagementLimits>({
    limitType: 'maxVehicles',
    getLimit: (limits) => limits.maxVehicles,
    getCurrent: async (userId) =>
      count('vehicles', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createVehicleSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createVehicleSchema>
      const now = new Date().toISOString()
      const plate = body.license_plate ?? body.plate ?? body.name ?? 'NEW-VEHICLE'

      const result = await create('vehicles', {
        owner_id: userId,
        name: body.name ?? plate,
        vin: body.vin ?? null,
        license_plate: plate,
        type: body.type ?? body.vehicle_type ?? 'truck',
        make: body.make ?? '',
        model: body.model ?? '',
        year: body.year ?? null,
        fuel_type: body.fuel_type ?? 'diesel',
        mileage: body.mileage ?? body.odometer ?? 0,
        odometer_km: Math.round((body.mileage ?? body.odometer ?? 0) * 1.609344),
        assigned_driver_id: body.assigned_driver_id ?? body.driver_id ?? null,
        photo_url: body.photo_url ?? null,
        status: 'operational',
        notes: body.location ?? '',
        fuel_level_pct: 100,
        created_at: now,
        updated_at: now,
      })
      const drivers = await findMany('drivers', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
      })
      const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
      res.status(201).json(shapeVehicle(result.data as Record<string, unknown>, driverById))
    } catch (err) {
      logger.error('[vehicles] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update vehicle — owner-only.
router.put('/:id', validateBody(updateVehicleSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('vehicles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('vehicles.notFound', {}, { defaultValue: 'Vehicle not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateVehicleSchema>
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.name !== undefined) updates.name = body.name
    if (body.plate !== undefined || body.license_plate !== undefined) {
      updates.license_plate = body.license_plate ?? body.plate
    }
    if (body.vin !== undefined) updates.vin = body.vin
    if (body.make !== undefined) updates.make = body.make
    if (body.model !== undefined) updates.model = body.model
    if (body.year !== undefined) updates.year = body.year
    if (body.type !== undefined || body.vehicle_type !== undefined) {
      updates.type = body.type ?? body.vehicle_type
    }
    if (body.fuel_type !== undefined) updates.fuel_type = body.fuel_type
    if (body.mileage !== undefined || body.odometer !== undefined) {
      const miles = body.mileage ?? body.odometer ?? 0
      updates.mileage = miles
      updates.odometer_km = Math.round(miles * 1.609344)
    }
    if (body.assigned_driver_id !== undefined || body.driver_id !== undefined) {
      updates.assigned_driver_id = body.assigned_driver_id ?? body.driver_id
    }
    if (body.fuel_level_pct !== undefined || body.fuel_pct !== undefined) {
      updates.fuel_level_pct = body.fuel_level_pct ?? body.fuel_pct
    }
    if (body.status !== undefined) updates.status = body.status
    if (body.location !== undefined) updates.notes = body.location

    const result = await updateById('vehicles', req.params.id as string, updates)
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(shapeVehicle(result.data as Record<string, unknown>, driverById))
  } catch (err) {
    logger.error('[vehicles] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update vehicle location (GPS ping) — owner-only.
router.post('/:id/location', validateBody(locationSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('vehicles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('vehicles.notFound', {}, { defaultValue: 'Vehicle not found' }),
      })
      return
    }

    const { latitude, longitude, speed, heading } = req.body as z.infer<typeof locationSchema>
    const now = new Date().toISOString()

    await create('vehicle_locations', {
      vehicle_id: req.params.id as string,
      latitude,
      longitude,
      speed: speed ?? 0,
      heading: heading ?? 0,
      timestamp: now,
    })

    await updateById('vehicles', req.params.id as string, {
      current_latitude: latitude,
      current_longitude: longitude,
      current_speed: speed ?? 0,
      last_seen_at: now,
      updated_at: now,
    })

    res.json({ ok: true })
  } catch (err) {
    logger.error('[vehicles] location failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete vehicle — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('vehicles', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('vehicles.notFound', {}, { defaultValue: 'Vehicle not found' }),
      })
      return
    }
    await deleteById('vehicles', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[vehicles] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
