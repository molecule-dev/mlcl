import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { index, search } from '@molecule/api-search'

import { decorateShipment, decorateShipments, type ShipmentRow } from '../lib/decorate.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

function fail(res: Response, where: string, err: unknown): void {
  logger.error?.(`shipments.${where} failed: ${(err as Error)?.stack ?? err}`)
  res.status(500).json({
    error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
  })
}

const createShipmentSchema = z.object({
  tracking_number: z.string().min(1),
  carrier_id: z.string().nullable().optional(),
  recipient_name: z.string().optional(),
  recipient_email: z.string().email().optional().or(z.literal('')),
  origin: z.string().optional(),
  destination: z.string().min(1),
  expected_delivery: z.string().optional(),
})

const updateShipmentSchema = z.object({
  carrier_id: z.string().nullable().optional(),
  recipient_name: z.string().optional(),
  recipient_email: z.string().email().optional().or(z.literal('')),
  origin: z.string().optional(),
  destination: z.string().min(1).optional(),
  expected_delivery: z.string().optional(),
  status: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    try {
      await seedDemoForUser(userId)
    } catch (err) {
      logger.warn?.(`seed failed: ${(err as Error).message}`)
    }
    const { status, carrier, carrier_id, page = '1', limit = '50' } = req.query

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    // The Carrier Detail page filters with `?carrier_id=`; `?carrier=` is kept
    // as an alias so either spelling works.
    const carrierFilter = carrier_id ?? carrier
    if (carrierFilter)
      where.push({ field: 'carrier_id', operator: '=', value: String(carrierFilter) })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]

    const shipments = await findMany<ShipmentRow>('shipments', {
      where,
      orderBy,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    res.json(await decorateShipments(shipments))
  } catch (err) {
    fail(res, 'list', err)
  }
})

router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { q, page = '1', limit = '50' } = req.query
    if (!q) {
      res.status(400).json({
        error: t('shipments.searchRequired', undefined, {
          defaultValue: 'Search query is required',
        }),
      })
      return
    }
    const results = await search('shipments', {
      text: String(q),
      page: Number(page),
      perPage: Number(limit),
    })
    res.json(results)
  } catch (err) {
    fail(res, 'search', err)
  }
})

router.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const statuses = [
      'created',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'exception',
    ]
    const counts: Record<string, number> = {}
    for (const status of statuses) {
      const items = await findMany('shipments', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'status', operator: '=', value: status },
        ],
        limit: 10_000,
      })
      counts[status] = Array.isArray(items) ? items.length : 0
    }
    res.json(counts)
  } catch (err) {
    fail(res, 'stats', err)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const shipment = await findById<ShipmentRow>('shipments', id)
    if (!shipment || shipment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('shipments.notFound', undefined, { defaultValue: 'Shipment not found' }) })
      return
    }
    const events = await findMany('tracking_events', {
      where: [{ field: 'shipment_id', operator: '=', value: id }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
    })
    const decorated = await decorateShipment(shipment)
    res.json({ ...decorated, tracking_events: events })
  } catch (err) {
    fail(res, 'get', err)
  }
})

router.post('/', validateBody(createShipmentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const {
      tracking_number,
      carrier_id,
      recipient_name,
      recipient_email,
      origin,
      destination,
      expected_delivery,
    } = req.body

    const result = await create<ShipmentRow>('shipments', {
      user_id: userId,
      tracking_number,
      carrier_id: carrier_id || null,
      recipient_name: recipient_name || null,
      recipient_email: recipient_email || null,
      origin: origin || null,
      destination,
      expected_delivery: expected_delivery ? new Date(expected_delivery) : null,
      status: 'created',
      created_at: new Date(),
      updated_at: new Date(),
    })

    const shipment = result.data ?? undefined
    if (shipment?.id) {
      await create('tracking_events', {
        shipment_id: shipment.id,
        status: 'created',
        description: t('shipments.createdEvent', undefined, { defaultValue: 'Shipment created' }),
        location: origin || null,
        timestamp: new Date(),
      })
      try {
        await index(
          'shipments',
          String(shipment.id),
          shipment as unknown as Record<string, unknown>,
        )
      } catch (indexErr) {
        logger.warn?.(`shipments index failed: ${(indexErr as Error).message}`)
      }
    }
    res.status(201).json(shipment ? await decorateShipment(shipment) : null)
  } catch (err) {
    fail(res, 'create', err)
  }
})

router.put('/:id', validateBody(updateShipmentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<ShipmentRow>('shipments', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('shipments.notFound', undefined, { defaultValue: 'Shipment not found' }) })
      return
    }
    const result = await updateById<ShipmentRow>('shipments', id, {
      ...req.body,
      updated_at: new Date(),
    })
    try {
      const updated = result.data as unknown as Record<string, unknown>
      await index('shipments', String(updated?.id ?? id), updated)
    } catch (indexErr) {
      logger.warn?.(`shipments index failed: ${(indexErr as Error).message}`)
    }
    const updated = result.data as ShipmentRow
    res.json(updated ? await decorateShipment(updated) : null)
  } catch (err) {
    fail(res, 'update', err)
  }
})

router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const shipment = await findById<ShipmentRow>('shipments', id)
    if (!shipment || shipment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('shipments.notFound', undefined, { defaultValue: 'Shipment not found' }) })
      return
    }
    const events = await findMany('tracking_events', {
      where: [{ field: 'shipment_id', operator: '=', value: id }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
    })
    res.json(events)
  } catch (err) {
    fail(res, 'events', err)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<ShipmentRow>('shipments', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('shipments.notFound', undefined, { defaultValue: 'Shipment not found' }) })
      return
    }
    await deleteById('shipments', id)
    res.status(204).end()
  } catch (err) {
    fail(res, 'delete', err)
  }
})

export default router
