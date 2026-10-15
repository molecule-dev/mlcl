import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  deleteMany,
  findById,
  findMany,
  findOne,
  query,
  updateById,
  withTransaction,
} from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import type { OrderRow, OrderStatus } from '@molecule/api-resource-order'
import { canDriveOrderLifecycle, MERCHANT_STATES } from '@molecule/api-resource-order'

import { resolveShipping } from '../lib/shipping.js'
import { resolveTaxRate } from '../lib/tax.js'

/**
 * Adapt this store's snake_case `orders` row to the package's camelCase
 * `OrderRow` so the shared merchant gate (`canDriveOrderLifecycle`) can be
 * consulted with a correctly-typed argument. The single-merchant authorizer
 * keys off the caller's admin role rather than any order field, but the gate's
 * contract takes a typed `OrderRow`.
 */
const toOrderRow = (row: Record<string, unknown>): OrderRow => ({
  id: String(row.id),
  userId: String(row.user_id ?? ''),
  status: String(row.status ?? 'pending') as OrderStatus,
  subtotal: Number(row.subtotal ?? 0),
  tax: Number(row.tax ?? 0),
  shipping: Number(row.shipping ?? 0),
  discount: Number(row.discount ?? 0),
  total: Number(row.total ?? 0),
  shippingAddress: row.shipping_address == null ? null : JSON.stringify(row.shipping_address),
  billingAddress: row.billing_address == null ? null : JSON.stringify(row.billing_address),
  paymentId: (row.payment_method_id as string | null) ?? null,
  notes: (row.notes as string | null) ?? null,
  createdAt: String(row.created_at ?? ''),
  updatedAt: String(row.updated_at ?? ''),
})

/**
 * 403 response for a denied MERCHANT lifecycle op. The order owner is the
 * BUYER, so refund / ship / deliver / cancelling a progressed order require the
 * store-admin merchant authorizer registered via `setOrderMerchantAuthorizer`.
 */
const merchantForbidden = (res: Response): Response =>
  res.status(403).json({
    error: t(
      'order.error.merchantForbidden',
      {},
      { defaultValue: 'Merchant authorization is required to manage this order' },
    ),
  })

const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional().default(''),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
})

const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethodId: z.string().min(1).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
})

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
})

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

// List user's orders
router.get('/', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const { status } = req.query

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const [orders, total] = await Promise.all([
      findMany<Record<string, unknown>>('orders', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('orders', where),
    ])

    // Hydrate items per order. Without this the OrdersPage has nothing
    // to render except the order-level totals — and historically that's
    // exactly what tempted past agents to fall back to hardcoded
    // sampleOrders, which then leaked five fake orders into every
    // freshly-signed-up user's account. Read-after-write: a freshly
    // placed order shows its real line items here.
    const hydrated = await Promise.all(
      orders.map(async (o) => {
        const items = await findMany<Record<string, unknown>>('order_items', {
          where: [{ field: 'order_id', operator: '=', value: String(o.id) }],
        })
        return { ...o, items }
      }),
    )

    res.json({ data: hydrated, total, page, limit })
  } catch (error) {
    logger.error('orders.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get order detail
router.get('/:id', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const order = await findById<Record<string, unknown>>('orders', req.params.id)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }

    if (order.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('order.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const items = await findMany<Record<string, unknown>>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: req.params.id }],
    })

    res.json({ ...order, items })
  } catch (error) {
    logger.error('orders.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create order (checkout)
router.post('/', validateBody(createOrderSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { shippingAddress } = req.body
    const billingAddress = req.body.billingAddress ?? shippingAddress
    const paymentMethodId = req.body.paymentMethodId ?? 'pm_demo_card'

    // Get cart items
    const cartItems = await findMany<Record<string, unknown>>('cart_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (cartItems.length === 0) {
      return res
        .status(400)
        .json({ error: t('order.emptyCart', {}, { defaultValue: 'Cart is empty' }) })
    }

    // Calculate totals and verify inventory
    let subtotal = 0
    let storeOwnerId: string | null = null
    const orderItems: Record<string, unknown>[] = []

    for (const item of cartItems) {
      const product = await findById<Record<string, unknown>>('products', item.product_id as string)
      if (!product) continue
      if (!storeOwnerId && product.user_id) storeOwnerId = String(product.user_id)
      // Reject checkout of a product that is no longer active (e.g. archived after being carted).
      // status gates catalog visibility but was never re-checked at checkout, so an archived
      // product could still be purchased.
      if (product.status !== 'active') {
        return res.status(400).json({
          error: t(
            'order.productUnavailable',
            { product: product.name as string },
            { defaultValue: `${product.name} is no longer available` },
          ),
        })
      }

      const qty = item.quantity as number
      const price = product.price as number

      // Check stock
      const stock = await findOne<Record<string, unknown>>('inventory', [
        { field: 'product_id', operator: '=', value: item.product_id as string },
      ])
      const available = (stock?.available as number) ?? 0
      if (available < qty) {
        return res.status(400).json({
          error: t(
            'order.insufficientStock',
            { product: product.name as string },
            { defaultValue: `Insufficient stock for ${product.name}` },
          ),
        })
      }

      subtotal += price * qty
      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: qty,
        unit_price: price,
        name: product.name,
      })
    }

    // Tax rate = the store owner's configured adminSettings.tax.taxRate (the
    // admin "Tax Rate (%)" field), resolved via the same helper the cart total
    // uses so the amount charged matches what the shopper was shown at checkout.
    // Falls back to STORE_TAX_RATE / 8% when the owner hasn't set a rate.
    const storeOwner = storeOwnerId
      ? await findById<Record<string, unknown>>('users', storeOwnerId)
      : null
    const taxRate = resolveTaxRate(storeOwner)
    const tax = Math.round(subtotal * taxRate)
    // Shipping fee from the store owner's configured adminSettings.shipping (free above
    // the threshold, else the standard rate) — the same helper the cart total uses, so
    // the amount charged matches what the shopper saw. Previously omitted entirely, so
    // the persisted order total silently dropped the shipping the checkout page displayed.
    const shipping = resolveShipping(storeOwner, subtotal)
    const total = subtotal + tax + shipping

    // The inventory check above is only a fast pre-flight. Reserving stock,
    // creating the order, and writing its items MUST be atomic: the old code
    // read `inventory.available`, then later wrote `Math.max(0, available -
    // quantity)` as an ABSOLUTE value computed from that stale read. Two
    // concurrent checkouts both read the same `available`, both passed the
    // guard, and both wrote the same decremented absolute — overselling the
    // product (negative real stock, more units sold than exist). We run the
    // whole mutation in ONE transaction and decrement each product with a
    // single CONDITIONAL UPDATE (`... WHERE available >= $qty`) that affects 0
    // rows when stock is gone, rolling the entire order back. The DataStore has no atomic decrement, so the
    // conditional UPDATEs are raw SQL; withTransaction makes every query() inside
    // it one transaction.
    let createdOrder: Record<string, unknown>
    try {
      createdOrder = await withTransaction(async () => {
        for (const item of orderItems) {
          const dec = await query<{ available: number }>(
            `UPDATE inventory
             SET available = available - $1, updated_at = now()
           WHERE product_id = $2 AND available >= $1
           RETURNING available`,
            [item.quantity, item.product_id],
          )
          if (dec.rowCount === 0 || dec.rows.length === 0) {
            throw new Refused(409, {
              error: t(
                'order.insufficientStock',
                { product: String(item.name) },
                { defaultValue: `Insufficient stock for ${String(item.name)}` },
              ),
            })
          }
          // Keep the Bestsellers counter in step with the sale: products.total_sold drives
          // GET /storefront/bestsellers (ORDER BY total_sold) but was never incremented, so the
          // ranking stayed frozen at 0. Atomic add in the same transaction as the stock decrement.
          await query(
            `UPDATE products SET total_sold = total_sold + $1, updated_at = now() WHERE id = $2`,
            [item.quantity, item.product_id],
          )
        }

        const orderIns = await query<Record<string, unknown>>(
          `INSERT INTO orders
           (user_id, status, subtotal, tax, shipping, total, currency,
            shipping_address, billing_address, payment_method_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
         RETURNING *`,
          [
            userId,
            'confirmed',
            subtotal,
            tax,
            shipping,
            total,
            process.env.STORE_CURRENCY || 'USD',
            JSON.stringify(shippingAddress),
            JSON.stringify(billingAddress),
            paymentMethodId,
          ],
        )
        const inserted = orderIns.rows[0]
        const orderId = inserted.id as string

        for (const item of orderItems) {
          await query(
            `INSERT INTO order_items
             (order_id, product_id, variant_id, quantity, unit_price, name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, now())`,
            [
              orderId,
              item.product_id,
              item.variant_id ?? null,
              item.quantity,
              item.unit_price,
              item.name,
            ],
          )
        }
        return inserted
      })
    } catch (err) {
      if (err instanceof Refused) return res.status(err.status).json(err.body)
      throw err
    }

    const orderId = createdOrder.id as string

    // Clear cart
    await deleteMany('cart_items', [{ field: 'user_id', operator: '=', value: userId }])

    // Send confirmation email
    const user = await findById<Record<string, unknown>>('users', userId)
    if (user?.email) {
      await sendMail({
        to: user.email as string,
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        subject: t('order.confirmationSubject', {}, { defaultValue: 'Order Confirmation' }),
        text: t(
          'order.confirmationBody',
          { orderId },
          { defaultValue: `Your order ${orderId} has been confirmed.` },
        ),
      }).catch(() => {}) // Don't fail the order if email fails
    }

    res.status(201).json(createdOrder)
  } catch (error) {
    logger.error('orders.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Update an order's status. The order owner is the BUYER, so a valid session
 * alone is NOT sufficient for a merchant-driven transition:
 *
 * - Target is a MERCHANT state (confirmed/processing/shipped/delivered): gated
 *   by the registered merchant authorizer (the store admin). Fails closed with
 *   403 `order.error.merchantForbidden` when no authorizer is registered or it
 *   denies.
 * - Target is `cancelled` and the order is still `pending`: the BUYER may cancel
 *   their OWN order (owner check — 403 `order.forbidden` for a non-owner).
 * - Target is `cancelled` and the order has progressed past `pending`: a
 *   merchant op, gated by the merchant authorizer.
 */
export const updateStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const id = req.params.id as string
    const status = req.body.status as OrderStatus

    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }

    const currentStatus = String(order.status ?? 'pending') as OrderStatus

    if (MERCHANT_STATES.includes(status)) {
      // Transition INTO a merchant state is merchant-only.
      if (!(await canDriveOrderLifecycle(toOrderRow(order), userId))) {
        return merchantForbidden(res)
      }
    } else if (currentStatus === 'pending') {
      // The only non-merchant target is `cancelled`. A buyer may cancel their
      // OWN order while it is still pending.
      if (order.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('order.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
    } else if (!(await canDriveOrderLifecycle(toOrderRow(order), userId))) {
      // Cancelling an already-progressed order is a merchant op.
      return merchantForbidden(res)
    }

    const result = await updateById<Record<string, unknown>>('orders', id, {
      status,
      updated_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }

    res.json(result.data)
  } catch (error) {
    logger.error('orders.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
}

router.put('/:id/status', validateBody(updateStatusSchema), updateStatus)

/**
 * Refund an order. This is ALWAYS a MERCHANT-only operation — the order owner
 * is the BUYER, who must never be able to self-service a refund on their own
 * order. There is no owner check: the caller must satisfy the registered
 * merchant authorizer (the store admin). Fails closed with 403
 * `order.error.merchantForbidden` until an authorizer is registered.
 */
export const refund = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const id = req.params.id as string
    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }

    if (!(await canDriveOrderLifecycle(toOrderRow(order), userId))) {
      return merchantForbidden(res)
    }

    if (order.status === 'refunded') {
      return res
        .status(400)
        .json({ error: t('order.alreadyRefunded', {}, { defaultValue: 'Order already refunded' }) })
    }

    // Flip the order to 'refunded' with a CONDITIONAL UPDATE that matches any
    // not-yet-refunded order by id. Refund is merchant-driven, so it is NOT
    // scoped to the buyer (`user_id`) — the merchant is a different user. This
    // keeps the refund idempotent under concurrency: the read-above `status ===
    // 'refunded'` check is a TOCTOU that two simultaneous refund requests both
    // pass, double-restocking inventory. When the guarded update affects 0 rows,
    // another request already refunded it.
    const flip = await query(
      `UPDATE orders
         SET status = 'refunded', updated_at = now()
       WHERE id = $1 AND status != 'refunded'
       RETURNING id`,
      [id],
    )
    if (flip.rowCount === 0 || flip.rows.length === 0) {
      return res
        .status(400)
        .json({ error: t('order.alreadyRefunded', {}, { defaultValue: 'Order already refunded' }) })
    }

    // Restore inventory with EXPRESSION-based atomic adds (not a stale-read
    // absolute write) so concurrent sales/refunds compose correctly.
    const items = await findMany<Record<string, unknown>>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: id }],
    })
    for (const item of items) {
      await query(
        `UPDATE inventory
           SET available = available + $1, updated_at = now()
         WHERE product_id = $2`,
        [item.quantity, item.product_id],
      )
      // Reverse the Bestsellers counter too (clamped at 0), symmetric with the checkout increment.
      await query(
        `UPDATE products SET total_sold = GREATEST(total_sold - $1, 0), updated_at = now()
         WHERE id = $2`,
        [item.quantity, item.product_id],
      )
    }

    res.json({ status: 'refunded', orderId: id })
  } catch (error) {
    logger.error('orders.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
}

router.post('/:id/refund', validateBody(refundSchema), refund)

export default router
