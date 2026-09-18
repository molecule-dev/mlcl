import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const createShipmentSchema = z.object({
  order_id: z.string().nullable().optional(),
  carrier: z.enum(['ups', 'usps', 'fedex', 'dhl', 'mock', 'other']).default('mock'),
  tracking_number: z.string().nullable().optional(),
  weight_oz: z.number().nonnegative().default(0),
  status: z
    .enum(['label_created', 'in_transit', 'delivered', 'exception'])
    .default('label_created'),
})

const updateStatusSchema = z.object({
  status: z.enum(['label_created', 'in_transit', 'delivered', 'exception']),
  description: z.string().optional(),
  location: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const status = typeof req.query.status === 'string' ? req.query.status : null
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const shipments = await findMany('shipments', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(shipments)
  } catch (error) {
    logger.error('shipments.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const shipment = await findById<Record<string, unknown>>('shipments', id)
    if (!shipment) {
      return res
        .status(404)
        .json({ error: t('shipments.notFound', {}, { defaultValue: 'Shipment not found' }) })
    }
    if (shipment.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const events = await findMany('shipment_events', {
      where: [{ field: 'shipment_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ ...shipment, events })
  } catch (error) {
    logger.error('shipments.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = createShipmentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const data = parsed.data
    // Mock shipping provider: if no tracking_number provided, mint one.
    // Real EasyPost/Shippo integration is BLOCKED: shipping-bond pending
    // (see INVENTORY: shipping integration is v2).
    const trackingNumber = data.tracking_number ?? `MOCK-${Date.now().toString(36).toUpperCase()}`

    const result = await create<Record<string, unknown>>('shipments', {
      user_id: userId,
      order_id: data.order_id ?? null,
      carrier: data.carrier,
      tracking_number: trackingNumber,
      weight_oz: data.weight_oz,
      status: data.status,
      created_at: new Date(),
    })

    if (result.data) {
      await create('shipment_events', {
        user_id: userId,
        shipment_id: result.data.id as string,
        status: data.status,
        description: 'Label created',
        created_at: new Date(),
      })
    }

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('shipments.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('shipments', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('shipments.notFound', {}, { defaultValue: 'Shipment not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    await create('shipment_events', {
      user_id: userId,
      shipment_id: id,
      status: parsed.data.status,
      description: parsed.data.description ?? '',
      location: parsed.data.location ?? null,
      created_at: new Date(),
    })

    const result = await updateById('shipments', id, {
      status: parsed.data.status,
      shipped_at:
        parsed.data.status === 'in_transit' ? new Date() : (existing.shipped_at as Date | null),
      delivered_at:
        parsed.data.status === 'delivered' ? new Date() : (existing.delivered_at as Date | null),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('shipments.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
