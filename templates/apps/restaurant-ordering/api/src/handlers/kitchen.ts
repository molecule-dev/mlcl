import { type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

const itemStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready']),
})

// Get all active kitchen orders (operator scoped — pending + preparing + ready)
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    // Kitchen orders are multi-tenant (owned by user_id). ALWAYS scope to the
    // authenticated owner before the status filter — an empty where-clause
    // would expose every restaurant's active orders cross-tenant.
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

    if (req.query.status) {
      where.push({ field: 'status', operator: '=', value: String(req.query.status) })
    } else {
      where.push({ field: 'status', operator: 'in', value: ['pending', 'preparing', 'ready'] })
    }

    const orders = await findMany<Record<string, unknown>>('orders', {
      where,
      limit: 100,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await findMany<Record<string, unknown>>('order_items', {
          where: [{ field: 'order_id', operator: '=', value: order.id as string }],
          limit: 200,
        })
        return { ...order, items }
      }),
    )

    res.json({ data: ordersWithItems, total: ordersWithItems.length })
  } catch (error) {
    logger.error('kitchen.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get single kitchen order with items (owner check by user_id)
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const order = await findById<Record<string, unknown>>('orders', req.params.id)
    if (!order || order.user_id !== userId) {
      // 404 (not 403) on a cross-owner id so existence isn't probeable.
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    const items = await findMany<Record<string, unknown>>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: req.params.id }],
      limit: 200,
    })
    res.json({ ...order, items })
  } catch (error) {
    logger.error('kitchen.getOrder', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Helper to apply a status transition to an order with realtime broadcasts.
async function applyOrderStatus(
  res: Response,
  orderId: string,
  status: 'preparing' | 'ready' | 'served',
  timestampField: string,
): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const order = await findById<Record<string, unknown>>('orders', orderId)
  if (!order) {
    res.status(404).json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    return
  }
  if (order.user_id && order.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const result = await updateById<Record<string, unknown>>('orders', orderId, {
    status,
    [timestampField]: new Date().toISOString(),
  })

  broadcast('kitchen', 'order_status', {
    orderId,
    status,
    tableNumber: order.table_number,
  })
  if (order.table_id) {
    broadcast(`table:${String(order.table_id)}`, 'order_status', { orderId, status })
  }
  res.json(result.data)
}

// Start preparing an order
router.put('/:id/start', async (req, res) => {
  try {
    await applyOrderStatus(res, req.params.id as string, 'preparing', 'started_at')
  } catch (error) {
    logger.error('kitchen.start', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark order as ready
router.put('/:id/ready', async (req, res) => {
  try {
    await applyOrderStatus(res, req.params.id as string, 'ready', 'ready_at')
  } catch (error) {
    logger.error('kitchen.ready', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark order as served
router.put('/:id/served', async (req, res) => {
  try {
    await applyOrderStatus(res, req.params.id as string, 'served', 'served_at')
  } catch (error) {
    logger.error('kitchen.served', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update individual order item status (kitchen line cook)
router.put(
  '/:orderId/items/:itemId/status',
  validateBody(itemStatusSchema) as RequestHandler,
  async (req, res) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      }
      const orderId = req.params.orderId as string
      const itemId = req.params.itemId as string
      const order = await findById<Record<string, unknown>>('orders', orderId)
      if (!order) {
        return res
          .status(404)
          .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
      }
      if (order.user_id && order.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      const body = req.body as z.infer<typeof itemStatusSchema>
      const result = await updateById<Record<string, unknown>>('order_items', itemId, {
        status: body.status,
      })
      if (!result.data) {
        return res
          .status(404)
          .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
      }
      broadcast('kitchen', 'item_status', {
        orderId,
        itemId,
        status: body.status,
      })
      res.json(result.data)
    } catch (error) {
      logger.error('kitchen.itemStatus', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
