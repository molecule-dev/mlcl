import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  create,
  findById,
  findMany,
  query,
  updateById,
  withTransaction,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUserSafe } from './_seed.js'

const router = Router()

/** A request refused inside its transaction: rolled back, then answered with this. */
class Refused extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(String(body.error))
  }
}

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const listOrdersQuery = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
})

const createOrderSchema = z.object({
  reference: z.string().min(1).max(100),
  type: z.enum(['inbound', 'outbound']),
  partner: z.string().min(1),
  warehouse_id: z.string().min(1),
  notes: z.string().optional(),
  expected_at: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        sku: z.string().optional(),
        name: z.string().optional(),
        expected_quantity: z.number().int().positive(),
        unit_cost_cents: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
})

// List orders for the authed user
router.get('/', validateQuery(listOrdersQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const { type, status, page, limit } = req.query as unknown as z.infer<typeof listOrdersQuery>

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (type) where.push({ field: 'type', operator: '=', value: type })
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const orders = await findMany('orders', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    // Hydrate warehouse names for the list view (cheap N+1; total orders are small).
    const whIds = Array.from(
      new Set(orders.map((o) => String(o.warehouse_id ?? '')).filter(Boolean)),
    )
    const warehouseLookup: Record<string, { id: string; name: string }> = {}
    for (const id of whIds) {
      const wh = await findById('warehouses', id)
      if (wh && wh.user_id === userId) {
        warehouseLookup[id] = { id: String(wh.id), name: String(wh.name) }
      }
    }

    res.json(
      orders.map((o) => ({
        ...o,
        warehouse: o.warehouse_id ? (warehouseLookup[String(o.warehouse_id)] ?? null) : null,
      })),
    )
  } catch (error) {
    console.error('Failed to list orders', error)
    res
      .status(500)
      .json({ error: t('orders.listFailed', {}, { defaultValue: 'Failed to list orders' }) })
  }
})

// Get single order with line items + warehouse
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string

    const order = await findById('orders', id)
    if (!order || order.user_id !== userId) {
      res.status(404).json({ error: t('orders.notFound', {}, { defaultValue: 'Order not found' }) })
      return
    }

    const items = await findMany('order_items', {
      where: [{ field: 'order_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    let warehouse: { id: string; name: string; code: string } | null = null
    if (order.warehouse_id) {
      const wh = await findById('warehouses', String(order.warehouse_id))
      if (wh && wh.user_id === userId) {
        warehouse = { id: String(wh.id), name: String(wh.name), code: String(wh.code) }
      }
    }

    res.json({ ...order, items, warehouse })
  } catch (error) {
    console.error('Failed to get order', error)
    res
      .status(500)
      .json({ error: t('orders.getFailed', {}, { defaultValue: 'Failed to get order' }) })
  }
})

// Create order (PO or SO)
router.post('/', validateBody(createOrderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const body = req.body as z.infer<typeof createOrderSchema>

    const wh = await findById('warehouses', body.warehouse_id)
    if (!wh || wh.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('warehouses.notFound', {}, { defaultValue: 'Warehouse not found' }) })
      return
    }

    let totalUnits = 0
    let totalValue = 0
    for (const line of body.items) {
      totalUnits += Number(line.expected_quantity)
      totalValue += Number(line.expected_quantity) * Number(line.unit_cost_cents ?? 0)
    }

    const result = await create('orders', {
      user_id: userId,
      reference: body.reference,
      type: body.type,
      status: body.type === 'inbound' ? 'inbound' : 'outbound',
      partner: body.partner,
      warehouse_id: body.warehouse_id,
      expected_at: body.expected_at ?? null,
      total_units: totalUnits,
      total_value_cents: totalValue,
      notes: body.notes ?? '',
    })
    const order = result.data ?? {}
    const orderId = String(order.id ?? '')

    for (const line of body.items) {
      const product = await findById('products', line.product_id)
      const isOwned = product && product.user_id === userId
      await create('order_items', {
        order_id: orderId,
        product_id: line.product_id,
        sku: line.sku ?? (isOwned ? String(product.sku ?? '') : ''),
        name: line.name ?? (isOwned ? String(product.name ?? '') : ''),
        expected_quantity: Number(line.expected_quantity),
        received_quantity: 0,
        unit_cost_cents: Number(line.unit_cost_cents ?? 0),
      })
    }

    res.status(201).json(order)
  } catch (error) {
    console.error('Failed to create order', error)
    res
      .status(500)
      .json({ error: t('orders.createFailed', {}, { defaultValue: 'Failed to create order' }) })
  }
})

// Mark order as received: posts stock_movements + bumps stock_levels per line.
router.post('/:id/receive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const order = await findById('orders', id)
    if (!order || order.user_id !== userId) {
      res.status(404).json({ error: t('orders.notFound', {}, { defaultValue: 'Order not found' }) })
      return
    }

    if (order.status === 'received' || order.status === 'shipped' || order.status === 'cancelled') {
      res.status(400).json({
        error: t(
          'orders.cannotReceive',
          { status: String(order.status) },
          { defaultValue: 'Order is already in terminal status: {{status}}' },
        ),
      })
      return
    }

    const reason = order.type === 'inbound' ? 'receive' : 'shipment'
    const direction = order.type === 'inbound' ? 1 : -1
    const newStatus = order.type === 'inbound' ? 'received' : 'shipped'

    const items = await findMany('order_items', {
      where: [{ field: 'order_id', operator: '=', value: id }],
    })

    // Receiving/shipping an order moves real stock across several coupled writes
    // and MUST be atomic + idempotent. The old code read each stock row and
    // wrote `Math.max(0, quantity ± qty)` as an ABSOLUTE value computed from a
    // stale read — a TOCTOU lost-update where concurrent stock changes clobber
    // each other, and the `Math.max(0, …)` silently hid oversell on shipment.
    // It also flipped the order status after a separate read-check, so two
    // concurrent receives both passed the terminal-status guard and
    // double-applied the movements. We run it in ONE transaction: first CLAIM
    // the order with a conditional status flip (0 rows ⇒ already terminal/raced),
    // then debit shipments with a guarded conditional UPDATE (0 rows ⇒
    // insufficient stock ⇒ roll the whole order back). The DataStore has no atomic decrement, so the
    // conditional UPDATEs are raw SQL; withTransaction makes every query() inside
    // it one transaction.
    let updatedOrder: Record<string, unknown> | undefined
    try {
      updatedOrder = await withTransaction(async () => {
        const claim = await query<Record<string, unknown>>(
          `UPDATE orders
           SET status = $1, received_at = now(), updated_at = now()
         WHERE id = $2 AND user_id = $3
           AND status NOT IN ('received', 'shipped', 'cancelled')
         RETURNING *`,
          [newStatus, id, userId],
        )
        if (claim.rowCount === 0 || claim.rows.length === 0) {
          throw new Refused(400, {
            error: t(
              'orders.cannotReceive',
              { status: String(order.status) },
              { defaultValue: 'Order is already in terminal status: {{status}}' },
            ),
          })
        }
        const claimed = claim.rows[0]

        for (const item of items) {
          if (!item.product_id) continue
          const productId = String(item.product_id)
          const warehouseId = String(order.warehouse_id ?? '')
          if (!warehouseId) continue
          const qty = Number(item.expected_quantity)

          if (direction > 0) {
            // Inbound: atomic add, upsert when the row is absent.
            const inc = await query(
              `UPDATE stock_levels
               SET quantity = quantity + $1, updated_at = now()
             WHERE product_id = $2 AND warehouse_id = $3`,
              [qty, productId, warehouseId],
            )
            if (inc.rowCount === 0) {
              await query(
                `INSERT INTO stock_levels (product_id, warehouse_id, quantity)
               VALUES ($1, $2, $3)`,
                [productId, warehouseId, qty],
              )
            }
          } else {
            // Outbound: guarded atomic debit — fail (and roll the whole shipment
            // back) when the warehouse lacks the stock.
            const dec = await query<{ quantity: number }>(
              `UPDATE stock_levels
               SET quantity = quantity - $1, updated_at = now()
             WHERE product_id = $2 AND warehouse_id = $3 AND quantity >= $1
             RETURNING quantity`,
              [qty, productId, warehouseId],
            )
            if (dec.rowCount === 0 || dec.rows.length === 0) {
              throw new Refused(409, {
                error: t(
                  'orders.insufficientStock',
                  {},
                  { defaultValue: 'Insufficient stock to ship this order' },
                ),
              })
            }
          }

          await query(
            `INSERT INTO stock_movements
             (product_id, warehouse_id, quantity_change, reason, reference, performed_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
            [productId, warehouseId, direction * qty, reason, `order:${id}`, userId],
          )

          await query(`UPDATE order_items SET received_quantity = $1 WHERE id = $2`, [
            qty,
            String(item.id),
          ])
        }

        return claimed
      })
    } catch (err) {
      if (!(err instanceof Refused)) throw err
      res.status(err.status).json(err.body)
      return
    }

    // Append a notification so /notifications reflects it (best-effort, post-commit)
    await create('notifications', {
      user_id: userId,
      kind: 'order',
      icon: order.type === 'inbound' ? 'inventory_2' : 'local_shipping',
      title: order.type === 'inbound' ? 'Order received' : 'Order shipped',
      body: `${order.reference} marked ${newStatus}.`,
      href: `/orders/${id}`,
      read: false,
    })

    res.json(updatedOrder)
  } catch (error) {
    console.error('Failed to receive order', error)
    res
      .status(500)
      .json({ error: t('orders.receiveFailed', {}, { defaultValue: 'Failed to receive order' }) })
  }
})

// Cancel order
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const order = await findById('orders', id)
    if (!order || order.user_id !== userId) {
      res.status(404).json({ error: t('orders.notFound', {}, { defaultValue: 'Order not found' }) })
      return
    }

    if (order.status === 'received' || order.status === 'shipped') {
      res.status(400).json({
        error: t(
          'orders.cannotCancel',
          { status: String(order.status) },
          { defaultValue: 'Cannot cancel order in status {{status}}' },
        ),
      })
      return
    }

    const result = await updateById('orders', id, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to cancel order', error)
    res
      .status(500)
      .json({ error: t('orders.cancelFailed', {}, { defaultValue: 'Failed to cancel order' }) })
  }
})

export default router
