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
import { asMap, shapeDriver } from './_shape.js'

const router = Router()

const createDriverSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(64).optional(),
  license_number: z.string().max(64).optional(),
  license_expires: z.string().optional(),
  license_expiry: z.string().optional(),
  license_class: z.string().max(40).optional(),
  vehicle_id: z.string().uuid().optional(),
  assigned_vehicle_id: z.string().uuid().optional(),
})

const updateDriverSchema = createDriverSchema.partial().extend({
  status: z.string().max(40).optional(),
  score: z.number().int().min(0).max(100).optional(),
  safety_score: z.number().int().min(0).max(100).optional(),
  hours_today: z.number().min(0).max(24).optional(),
  photo_url: z.string().url().max(2048).optional(),
})

const logHoursSchema = z.object({
  hours: z.number().min(0).max(24),
  date: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { status, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const drivers = await findMany('drivers', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(drivers.map((d) => shapeDriver(d as Record<string, unknown>, vehicleById)))
  } catch (err) {
    logger.error('[drivers] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('drivers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('drivers.notFound', {}, { defaultValue: 'Driver not found' }),
      })
      return
    }
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(shapeDriver(check.row as Record<string, unknown>, vehicleById))
  } catch (err) {
    logger.error('[drivers] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<FleetManagementLimits>({
    limitType: 'maxDrivers',
    getLimit: (limits) => limits.maxDrivers,
    getCurrent: async (userId) =>
      count('drivers', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDriverSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createDriverSchema>
      const now = new Date().toISOString()

      const result = await create('drivers', {
        owner_id: userId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        license_number: body.license_number ?? null,
        license_expiry: body.license_expiry ?? body.license_expires ?? null,
        assigned_vehicle_id: body.assigned_vehicle_id ?? body.vehicle_id ?? null,
        status: 'on_duty',
        hours_today: 0,
        score: 100,
        created_at: now,
        updated_at: now,
      })
      const vehicles = await findMany('vehicles', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
      })
      const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
      res.status(201).json(shapeDriver(result.data as Record<string, unknown>, vehicleById))
    } catch (err) {
      logger.error('[drivers] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateDriverSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('drivers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('drivers.notFound', {}, { defaultValue: 'Driver not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateDriverSchema>
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.name !== undefined) updates.name = body.name
    if (body.email !== undefined) updates.email = body.email
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.license_number !== undefined) updates.license_number = body.license_number
    if (body.license_expires !== undefined || body.license_expiry !== undefined) {
      updates.license_expiry = body.license_expiry ?? body.license_expires
    }
    if (body.vehicle_id !== undefined || body.assigned_vehicle_id !== undefined) {
      updates.assigned_vehicle_id = body.assigned_vehicle_id ?? body.vehicle_id
    }
    if (body.status !== undefined) updates.status = body.status
    if (body.score !== undefined || body.safety_score !== undefined) {
      updates.score = body.score ?? body.safety_score
    }
    if (body.hours_today !== undefined) updates.hours_today = body.hours_today
    if (body.photo_url !== undefined) updates.photo_url = body.photo_url

    const result = await updateById('drivers', req.params.id as string, updates)
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(shapeDriver(result.data as Record<string, unknown>, vehicleById))
  } catch (err) {
    logger.error('[drivers] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/hours', validateBody(logHoursSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('drivers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('drivers.notFound', {}, { defaultValue: 'Driver not found' }),
      })
      return
    }
    const { hours, date, notes } = req.body as z.infer<typeof logHoursSchema>

    await create('driver_hours', {
      driver_id: req.params.id as string,
      hours,
      date: date ?? new Date().toISOString().slice(0, 10),
      notes: notes ?? '',
      created_at: new Date().toISOString(),
    })

    // Update aggregate hours_today on driver row.
    const existingHours = Number((check.row as Record<string, unknown>).hours_today ?? 0)
    await updateById('drivers', req.params.id as string, {
      hours_today: existingHours + hours,
      updated_at: new Date().toISOString(),
    })

    res.status(201).json({ ok: true, hours_today: existingHours + hours })
  } catch (err) {
    logger.error('[drivers] log hours failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('drivers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('drivers.notFound', {}, { defaultValue: 'Driver not found' }),
      })
      return
    }
    await deleteById('drivers', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[drivers] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
