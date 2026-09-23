import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const createOrderSchema = z.object({
  externalOrderId: z.string().min(1).optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  shippingMethod: z.string().optional(),
  weightLb: z.number().nonnegative().optional(),
  priority: z.enum(['standard', 'rush', 'express']).default('standard'),
  status: z
    .enum(['pending', 'picking', 'packed', 'shipped', 'cancelled', 'returned'])
    .default('pending'),
  total: z.number().nonnegative().default(0),
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  promisedAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        price: z.number().nonnegative().default(0),
      }),
    )
    .optional(),
})

const updateOrderSchema = z.object({
  status: z.enum(['pending', 'picking', 'packed', 'shipped', 'cancelled', 'returned']).optional(),
  priority: z.enum(['standard', 'rush', 'express']).optional(),
  customerName: z.string().min(1).optional(),
  shippingMethod: z.string().optional(),
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
    const priority = typeof req.query.priority === 'string' ? req.query.priority : null
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'userId', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (priority) where.push({ field: 'priority', operator: '=', value: priority })

    const orders = await findMany('orders', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 200,
    })
    res.json(orders)
  } catch (err) {
    logger.error('order.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/stats/counts', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const statusResult = await query<{ status: string; count: number }>(
      'SELECT status, COUNT(*)::int AS count FROM orders WHERE "userId" = $1 GROUP BY status',
      [userId],
    )
    const rows = statusResult.rows
    const rushResult = await query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM orders WHERE "userId" = $1 AND priority = \'rush\'',
      [userId],
    )
    const rushRows = rushResult.rows
    const counts: Record<string, number> = {
      pending: 0,
      picking: 0,
      packed: 0,
      shipped: 0,
      cancelled: 0,
      returned: 0,
    }
    for (const r of rows) counts[r.status] = r.count
    counts.rush = rushRows[0]?.count ?? 0
    counts.total = rows.reduce((s, r) => s + r.count, 0)
    res.json(counts)
  } catch (err) {
    logger.error('order.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
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
    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('orders.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    if (order.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const items = await findMany('order_items', {
      where: [{ field: 'orderId', operator: '=', value: id }],
    })
    const events = await findMany('order_events', {
      where: [{ field: 'orderId', operator: '=', value: id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })
    res.json({ ...order, items, events })
  } catch (err) {
    logger.error('order.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
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

    const parsed = createOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const data = parsed.data
    const itemTotal = (data.items ?? []).reduce(
      (s, it) => s + Number(it.price) * Number(it.quantity),
      0,
    )
    const subtotal = data.subtotal ?? itemTotal
    const total = data.total > 0 ? data.total : subtotal + (data.tax ?? 0) + (data.shipping ?? 0)

    const result = await create<Record<string, unknown>>('orders', {
      userId,
      status: data.status,
      priority: data.priority,
      total,
      subtotal,
      tax: data.tax ?? 0,
      shipping: data.shipping ?? 0,
      shippingAddress: data.shippingAddress ?? null,
      paymentId: null,
      notes: null,
      customerName: data.customerName,
      customerEmail: data.customerEmail ?? null,
      externalOrderId: data.externalOrderId ?? null,
      shippingMethod: data.shippingMethod ?? null,
      weightLb: data.weightLb ?? null,
      promisedAt: data.promisedAt ? new Date(data.promisedAt) : null,
    })

    const order = result.data as { id: string }
    if (data.items && data.items.length > 0 && order.id) {
      for (const it of data.items) {
        await create('order_items', {
          orderId: order.id,
          productId: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
        })
      }
    }

    await create('order_events', {
      orderId: order.id,
      status: data.status,
      metadata: { actor: userId },
    })

    res.status(201).json(result.data)
  } catch (err) {
    logger.error('order.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('orders', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('orders.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updates[k] = v
    }
    const result = await updateById('orders', id, updates)

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await create('order_events', {
        orderId: id,
        status: parsed.data.status,
        metadata: { actor: userId, from: existing.status },
      })
    }

    res.json(result.data)
  } catch (err) {
    logger.error('order.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('orders', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('orders.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    if (existing.status === 'shipped') {
      return res.status(400).json({
        error: t(
          'orders.cannotCancelShipped',
          {},
          { defaultValue: 'Cannot cancel a shipped order' },
        ),
      })
    }

    const result = await updateById('orders', id, {
      status: 'cancelled',
      updatedAt: new Date(),
    })
    await create('order_events', {
      orderId: id,
      status: 'cancelled',
      metadata: { actor: userId, from: existing.status },
    })
    res.json(result.data)
  } catch (err) {
    logger.error('order.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
