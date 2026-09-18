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
import { asMap, shapeMaintenance } from './_shape.js'

const router = Router()

const createMaintenanceSchema = z.object({
  vehicle_id: z.string().uuid(),
  type: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  scheduled_date: z.string().optional(),
  scheduled_for: z.string().optional(),
  estimated_cost: z.number().min(0).max(1_000_000).optional(),
  cost_estimate: z.number().min(0).max(1_000_000).optional(),
  assigned_to: z.string().max(320).optional(),
  technician: z.string().max(320).optional(),
})

const completeMaintenanceSchema = z.object({
  actual_cost: z.number().min(0).max(1_000_000).optional(),
  notes: z.string().max(5000).optional(),
  new_mileage: z.number().int().min(0).optional(),
})

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { vehicle_id, status, type, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (vehicle_id) where.push({ field: 'vehicle_id', operator: '=', value: String(vehicle_id) })
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (type) where.push({ field: 'type', operator: '=', value: String(type) })

    const records = await findMany('maintenance_records', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'scheduled_date', direction: 'asc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(records.map((r) => shapeMaintenance(r as Record<string, unknown>, vehicleById)))
  } catch (err) {
    logger.error('[maintenance] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/upcoming', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const records = await findMany('maintenance_records', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'scheduled' },
      ],
      orderBy: [{ field: 'scheduled_date', direction: 'asc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(records.map((r) => shapeMaintenance(r as Record<string, unknown>, vehicleById)))
  } catch (err) {
    logger.error('[maintenance] upcoming failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('maintenance_records', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance record not found' }),
      })
      return
    }
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(shapeMaintenance(check.row as Record<string, unknown>, vehicleById))
  } catch (err) {
    logger.error('[maintenance] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<FleetManagementLimits>({
    limitType: 'maxMaintenance',
    getLimit: (limits) => limits.maxMaintenance,
    getCurrent: async (userId) =>
      count('maintenance_records', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createMaintenanceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createMaintenanceSchema>

      const vehicleCheck = await requireOwnership('vehicles', body.vehicle_id, userId)
      if (!vehicleCheck.ok) {
        res.status(vehicleCheck.status).json({
          error: t('vehicles.notFound', {}, { defaultValue: 'Vehicle not found' }),
        })
        return
      }

      const now = new Date().toISOString()
      const scheduled = body.scheduled_date ?? body.scheduled_for ?? null
      const cost = body.estimated_cost ?? body.cost_estimate ?? 0
      const result = await create('maintenance_records', {
        owner_id: userId,
        vehicle_id: body.vehicle_id,
        type: body.type ?? 'routine',
        kind: body.type ?? 'other',
        description: body.description ?? '',
        scheduled_date: scheduled,
        scheduled_at: scheduled,
        estimated_cost: cost,
        actual_cost: 0,
        cost_cents: Math.round(cost * 100),
        assigned_to: body.assigned_to ?? body.technician ?? null,
        status: 'scheduled',
        created_at: now,
        updated_at: now,
      })

      const vehicles = await findMany('vehicles', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
      })
      const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
      res.status(201).json(shapeMaintenance(result.data as Record<string, unknown>, vehicleById))
    } catch (err) {
      logger.error('[maintenance] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('maintenance_records', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance record not found' }),
      })
      return
    }

    const record = check.row as Record<string, unknown>
    const now = new Date().toISOString()

    await updateById('vehicles', String(record.vehicle_id), {
      status: 'in_maintenance',
      updated_at: now,
    })

    const result = await updateById('maintenance_records', req.params.id as string, {
      status: 'in_progress',
      started_at: now,
      updated_at: now,
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    res.json(shapeMaintenance(result.data as Record<string, unknown>, vehicleById))
  } catch (err) {
    logger.error('[maintenance] start failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/:id/complete',
  validateBody(completeMaintenanceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const check = await requireOwnership('maintenance_records', req.params.id as string, userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance record not found' }),
        })
        return
      }

      const record = check.row as Record<string, unknown>
      const { actual_cost, notes, new_mileage } = req.body as z.infer<
        typeof completeMaintenanceSchema
      >
      const now = new Date().toISOString()

      const vehicleUpdates: Record<string, unknown> = {
        status: 'operational',
        updated_at: now,
      }
      if (typeof new_mileage === 'number') vehicleUpdates.mileage = new_mileage

      await updateById('vehicles', String(record.vehicle_id), vehicleUpdates)

      const result = await updateById('maintenance_records', req.params.id as string, {
        status: 'completed',
        actual_cost: actual_cost ?? Number(record.estimated_cost ?? 0),
        notes: notes ?? '',
        completed_at: now,
        completed_by: userId,
        updated_at: now,
      })
      const vehicles = await findMany('vehicles', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
      })
      const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
      res.json(shapeMaintenance(result.data as Record<string, unknown>, vehicleById))
    } catch (err) {
      logger.error('[maintenance] complete failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('maintenance_records', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance record not found' }),
      })
      return
    }
    await deleteById('maintenance_records', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[maintenance] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
