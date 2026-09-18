import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeAlert } from './_shape.js'

const router = Router()

const createAlertSchema = z.object({
  kind: z.string().max(40).optional(),
  type: z.string().max(40).optional(),
  severity: z.string().max(40).optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  message: z.string().max(2000).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { kind, severity, acknowledged, resolved, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (kind) where.push({ field: 'kind', operator: '=', value: String(kind) })
    if (severity) where.push({ field: 'severity', operator: '=', value: String(severity) })
    const ackQuery = (acknowledged as string | undefined) ?? (resolved as string | undefined)
    if (ackQuery === 'true') {
      where.push({ field: 'acknowledged_at', operator: 'is_not_null', value: null })
    } else if (ackQuery === 'false') {
      where.push({ field: 'acknowledged_at', operator: 'is_null', value: null })
    }

    const alerts = await findMany('alerts', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(alerts.map((a) => shapeAlert(a as Record<string, unknown>, vehicleById, driverById)))
  } catch (err) {
    logger.error('[alerts] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('alerts', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }),
      })
      return
    }
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(shapeAlert(check.row as Record<string, unknown>, vehicleById, driverById))
  } catch (err) {
    logger.error('[alerts] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createAlertSchema>
    const now = new Date().toISOString()

    const result = await create('alerts', {
      owner_id: userId,
      kind: body.kind ?? body.type ?? 'speeding',
      severity: body.severity ?? 'low',
      vehicle_id: body.vehicle_id ?? null,
      driver_id: body.driver_id ?? null,
      message: body.message ?? '',
      occurred_at: now,
      payload: body.payload ? JSON.stringify(body.payload) : null,
      created_at: now,
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('[alerts] create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('alerts', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }),
      })
      return
    }
    const result = await updateById('alerts', req.params.id as string, {
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const vehicleById = asMap(vehicles as Array<Record<string, unknown>>, 'id')
    const driverById = asMap(drivers as Array<Record<string, unknown>>, 'id')
    res.json(shapeAlert(result.data as Record<string, unknown>, vehicleById, driverById))
  } catch (err) {
    logger.error('[alerts] acknowledge failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('alerts', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }),
      })
      return
    }
    await deleteById('alerts', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[alerts] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
