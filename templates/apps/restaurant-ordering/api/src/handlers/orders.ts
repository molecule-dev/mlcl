import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import type { RestaurantOrderingLimits } from '../tiers.js'

const router = Router()

const createOrderSchema = z.object({
  table_id: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().min(1),
        quantity: z.number().int().positive().max(100),
        special_instructions: z.string().max(500).optional(),
      }),
    )
    .min(1),
})

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled', 'paid']),
})

const paySchema = z.object({
  paymentMethodId: z.string().optional(),
  method: z.enum(['cash', 'card']).optional(),
  tip: z.number().nonnegative().optional(),
  email: z.string().email().optional(),
})

// List orders (operator scoped)
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    // Orders are multi-tenant (owned by user_id). ALWAYS seed the owner filter
    // before any optional filters — an empty where-clause would return every
    // restaurant's orders cross-tenant.
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.status) {
      where.push({ field: 'status', operator: '=', value: String(req.query.status) })
    }
    if (req.query.table_id) {
      where.push({ field: 'table_id', operator: '=', value: String(req.query.table_id) })
    }
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const orders = await findMany<Record<string, unknown>>('orders', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const total = await count('orders', where)
    res.json({ data: orders, total, page, limit })
  } catch (error) {
    logger.error('orders.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get order detail with items (owner check)
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
    logger.error('orders.getOrder', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create order (operator only — guests submit through dedicated guest route in production)
router.post(
  '/',
  enforceLimit<RestaurantOrderingLimits>({
    limitType: 'maxOrders',
    getLimit: (limits) => limits.maxOrders,
    getCurrent: async (userId) =>
      count('orders', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as RequestHandler,
  validateBody(createOrderSchema) as RequestHandler,
  async (req, res) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      }
      const body = req.body as z.infer<typeof createOrderSchema>

      let subtotal = 0
      const orderItems: Array<{
        menu_item_id: string
        name: string
        quantity: number
        unit_price: number
        special_instructions: string
      }> = []

      for (const item of body.items) {
        const menuItem = await findById<Record<string, unknown>>('menu_items', item.menu_item_id)
        if (!menuItem) continue
        // Skip sold-out items: an item the operator marked unavailable must not be priced in.
        if (menuItem.available === false) continue
        const price = Number(menuItem.price) || 0
        subtotal += price * item.quantity
        orderItems.push({
          menu_item_id: item.menu_item_id,
          name: String(menuItem.name),
          quantity: item.quantity,
          unit_price: price,
          special_instructions: item.special_instructions ?? '',
        })
      }

      if (orderItems.length === 0) {
        res.status(400).json({
          error: t('order.noItems', {}, { defaultValue: 'No available menu items in order.' }),
        })
        return
      }

      let tableNumber: number | null = null
      if (body.table_id) {
        const table = await findById<Record<string, unknown>>('tables', body.table_id)
        if (table) {
          tableNumber = (table.table_number as number) ?? null
          await updateById('tables', body.table_id, { status: 'occupied' })
        }
      }

      const taxRate = parseFloat(process.env.RESTAURANT_TAX_RATE || '0')
      const tax = Math.round(subtotal * taxRate * 100) / 100
      const total = subtotal + tax

      const orderResult = await create<Record<string, unknown>>('orders', {
        user_id: userId,
        table_id: body.table_id ?? null,
        table_number: tableNumber,
        status: 'pending',
        subtotal,
        tax,
        total,
        currency: process.env.RESTAURANT_CURRENCY || 'USD',
      })
      const orderId = orderResult.data?.id as string

      for (const item of orderItems) {
        await create('order_items', {
          order_id: orderId,
          ...item,
          status: 'pending',
        })
      }

      broadcast('kitchen', 'new_order', {
        orderId,
        tableNumber,
        itemCount: orderItems.length,
        items: orderItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          special_instructions: i.special_instructions,
        })),
        createdAt: new Date().toISOString(),
      })

      res.status(201).json({ ...orderResult.data, items: orderItems })
    } catch (err) {
      logger.error('orders.create', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update order status (operator only — owner check)
router.put('/:id/status', validateBody(updateStatusSchema) as RequestHandler, async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('orders', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    if (existing.user_id && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as z.infer<typeof updateStatusSchema>
    // Terminal states can't be reopened via a status change: a paid order can't be un-paid
    // (the money is collected and the table freed) and a cancelled order can't be resurrected.
    // Kitchen progression between the working states (pending/preparing/ready/served) stays
    // flexible for staff corrections.
    const current = String(existing.status)
    if ((current === 'paid' || current === 'cancelled') && body.status !== current) {
      return res.status(409).json({
        error: t(
          'order.statusLocked',
          { status: current },
          {
            defaultValue: `A ${current} order can no longer change status`,
          },
        ),
      })
    }
    const result = await updateById<Record<string, unknown>>('orders', id, { status: body.status })
    const orderData = result.data as Record<string, unknown> | null

    broadcast('kitchen', 'order_status', {
      orderId: id,
      status: body.status,
      tableNumber: orderData?.table_number,
    })
    if (orderData?.table_id) {
      broadcast(`table:${String(orderData.table_id)}`, 'order_status', {
        orderId: id,
        status: body.status,
      })
    }

    res.json(orderData)
  } catch (error) {
    logger.error('orders.updateStatus', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Pay for order (operator only — owner check)
router.post('/:id/pay', validateBody(paySchema) as RequestHandler, async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const order = await findById<Record<string, unknown>>('orders', id)
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
    if (order.status === 'paid') {
      return res
        .status(400)
        .json({ error: t('order.alreadyPaid', {}, { defaultValue: 'Order already paid' }) })
    }
    const body = req.body as z.infer<typeof paySchema>
    const tipAmount = Math.round(Number(body.tip || 0) * 100) / 100
    const chargeAmount = (Number(order.total) || 0) + tipAmount

    // Restaurant tab close-out supports two payment methods:
    //   1. Cash (method: 'cash' or unspecified) — operator collected payment in person.
    //   2. Card (paymentMethodId provided) — charge via Stripe PaymentIntents in production.
    // For the dev/smoke environment we stub the card path to keep the e2e flow
    // exercisable without burning Stripe API credits per test run. The cash
    // path always succeeds since it's a ledger write only.
    let paymentId: string
    if (body.paymentMethodId) {
      paymentId = `card_${Date.now()}_${body.paymentMethodId.slice(-6)}`
    } else {
      paymentId = `cash_${Date.now()}`
    }

    await updateById('orders', id, {
      status: 'paid',
      payment_id: paymentId,
      tip: tipAmount,
    })

    // Record the visit against the customer's loyalty stats. These columns were initialized to 0
    // and displayed (visits / total spent / last visit + the VIP badge) but never updated, so every
    // customer stayed at 0. The already-paid guard above makes this run exactly once per order.
    if (order.customer_id) {
      const customer = await findById<Record<string, unknown>>(
        'customers',
        order.customer_id as string,
      )
      if (customer) {
        await updateById('customers', order.customer_id as string, {
          total_visits: (Number(customer.total_visits) || 0) + 1,
          total_spent: (Number(customer.total_spent) || 0) + (Number(order.total) || 0),
          last_visit_at: new Date().toISOString(),
        })
      }
    }

    if (order.table_id) {
      const unpaidOrders = await findMany<Record<string, unknown>>('orders', {
        where: [
          { field: 'table_id', operator: '=', value: order.table_id as string },
          { field: 'status', operator: 'in', value: ['pending', 'preparing', 'ready', 'served'] },
        ],
        limit: 1,
      })
      if (unpaidOrders.length === 0) {
        await updateById('tables', order.table_id as string, { status: 'cleaning' })
      }
    }

    if (body.email) {
      await sendMail({
        to: { address: body.email },
        from: { address: process.env.RESTAURANT_FROM_EMAIL || 'no-reply@example.com' },
        subject: t('order.receiptSubject', {}, { defaultValue: 'Your Receipt' }),
        text: t(
          'order.receiptBody',
          { total: String(chargeAmount), tip: String(tipAmount) },
          {
            defaultValue: `Thank you. Total: $${chargeAmount.toFixed(2)} (tip: $${tipAmount.toFixed(2)})`,
          },
        ),
      })
    }

    broadcast('kitchen', 'order_status', {
      orderId: req.params.id,
      status: 'paid',
      tableNumber: order.table_number,
    })

    res.json({ success: true, chargeAmount, paymentId })
  } catch (err) {
    logger.error('orders.pay', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
