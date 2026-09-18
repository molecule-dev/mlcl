import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import {
  BUYER_ALLOWED_TRANSITIONS,
  canDriveOrderLifecycle,
  type OrderRow,
  type OrderStatus,
} from '@molecule/api-resource-order'

import { activeVendorIds } from '../lib/vendor-status.js'
import { seedDemoForUser } from './_seed.js'

const listOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional(),
})

const createOrderSchema = z.object({
  shippingAddress: z.unknown().optional(),
  billingAddress: z.unknown().optional(),
  paymentMethodId: z.string().optional(),
})

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
})

const router = Router()

function mapStatus(status: unknown): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'confirmed') return 'paid'
  return s || 'pending'
}

async function enrichOrder(order: Record<string, unknown>): Promise<Record<string, unknown>> {
  const orderId = order.id as string
  const items = await findMany<Record<string, unknown>>('order_items', {
    where: [{ field: 'order_id', operator: '=', value: orderId }],
  })
  let vendorName = ''
  let vendorSlug: string | undefined
  let vendorVerified: boolean | undefined
  if (order.vendor_id) {
    const vendor = await findById<Record<string, unknown>>('vendors', order.vendor_id as string)
    if (vendor) {
      vendorName = (vendor.name as string) || ''
      vendorSlug = (vendor.slug as string) || undefined
      vendorVerified = Boolean(vendor.verified)
    }
  }
  const mappedStatus = mapStatus(order.status)
  return {
    ...order,
    status: mappedStatus,
    placed_at: order.created_at ?? order.placed_at,
    display_id: order.display_id ?? `VND-${String(orderId).slice(0, 6).toUpperCase()}`,
    total_cents: Math.round(Number(order.total ?? 0) * 100),
    vendors: [
      {
        vendor_id: order.vendor_id,
        vendor_name: vendorName,
        vendor_slug: vendorSlug,
        vendor_verified: vendorVerified,
        status: mappedStatus,
        subtotal_cents: Math.round(Number(order.subtotal ?? order.total ?? 0) * 100),
        tracking_number: order.tracking_number ?? null,
        carrier: order.carrier ?? null,
        items: items.map((it) => ({
          product_id: it.product_id,
          name: (it.name as string) || 'Item',
          quantity: Number(it.quantity ?? 1),
          price_cents: Math.round(Number(it.unit_price ?? 0) * 100),
        })),
      },
    ],
  }
}

router.get('/', validateQuery(listOrdersQuery), async (req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const { page, limit, status } = req.query as unknown as z.infer<typeof listOrdersQuery>

    // Lazy seed: if a freshly signed-up user has no orders, seed one
    // prior completed order so the Orders / orders__id pages aren't
    // blank on first visit. Idempotent on buyer_id.
    const existingTotal = await count('orders', [
      { field: 'buyer_id', operator: '=', value: userId },
    ])
    if (existingTotal === 0) {
      try {
        await seedDemoForUser(userId)
      } catch (_error) {
        // best-effort seed; do not block list response
      }
    }

    const where: WhereCondition[] = [{ field: 'buyer_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const [rows, total] = await Promise.all([
      findMany<Record<string, unknown>>('orders', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('orders', where),
    ])
    const data = await Promise.all(rows.map(enrichOrder))
    res.json({ data, total, page, limit })
  } catch (error) {
    return next(error)
  }
})

// Vendor: list orders for my store (must come BEFORE /:id)
router.get('/vendor/mine', validateQuery(listOrdersQuery), async (req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const vendor = await findOne<Record<string, unknown>>('vendors', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!vendor) {
      return res
        .status(403)
        .json({ error: t('vendor.notActive', {}, { defaultValue: 'Vendor account not active' }) })
    }
    const { page, limit, status } = req.query as unknown as z.infer<typeof listOrdersQuery>
    const where: WhereCondition[] = [
      { field: 'vendor_id', operator: '=', value: vendor.id as string },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const [data, total] = await Promise.all([
      findMany<Record<string, unknown>>('orders', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('orders', where),
    ])
    res.json({ data, total, page, limit })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const orderId = String(req.params.id)
    const order = await findById<Record<string, unknown>>('orders', orderId)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    if (order.buyer_id !== userId) {
      const vendor = order.vendor_id
        ? await findById<Record<string, unknown>>('vendors', order.vendor_id as string)
        : null
      if (!vendor || vendor.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      }
    }

    const enriched = await enrichOrder(order)
    res.json(enriched)
  } catch (error) {
    return next(error)
  }
})

// Multi-vendor checkout. Splits the buyer's cart into one order per vendor,
// records vendor payout + commission rows, and clears the cart. Real Stripe
// PaymentIntent + Stripe Connect transfers happen in production via the
// @molecule/api-payments-stripe bond — gated by STRIPE_SECRET_KEY +
// STRIPE_CONNECT_ACCOUNT_ID, which the deterministic mock environment does
// not provide. See payouts.spec.ts for the BLOCKED marker on the live path.
router.post('/', validateBody(createOrderSchema), async (req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const { shippingAddress, billingAddress, paymentMethodId } = req.body as z.infer<
      typeof createOrderSchema
    >

    const cartItems = await findMany<Record<string, unknown>>('cart_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (!cartItems.length) {
      return res
        .status(400)
        .json({ error: t('order.emptyCart', {}, { defaultValue: 'Cart is empty' }) })
    }

    // A suspended/pending vendor cannot sell — drop their items from the checkout so no order (and
    // no payout) is created for them, even if they were suspended after the item was added to cart.
    const activeVendors = new Set(await activeVendorIds())
    const vendorGroups: Record<string, Array<Record<string, unknown>>> = {}
    for (const item of cartItems) {
      const product = await findById<Record<string, unknown>>('products', item.product_id as string)
      if (!product || !product.vendor_id) continue
      const vendorId = product.vendor_id as string
      if (!activeVendors.has(vendorId)) continue
      if (!vendorGroups[vendorId]) vendorGroups[vendorId] = []
      vendorGroups[vendorId].push({ ...item, product })
    }

    const vendorSubtotals: Record<string, number> = {}
    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      const subtotal = items.reduce((sum, item) => {
        const product = item.product as Record<string, unknown>
        const price = Number(product.price) || 0
        return sum + price * (Number(item.quantity) || 0)
      }, 0)
      vendorSubtotals[vendorId] = subtotal
    }

    const orders: Array<Record<string, unknown>> = []
    const fallbackRate = parseFloat(process.env.MARKETPLACE_COMMISSION_RATE || '0.08')

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      const subtotal = vendorSubtotals[vendorId]
      // Each vendor sets its own commission_rate (numeric column, default 0.10); the payout math
      // must use that stored per-vendor rate, not a single global env rate — otherwise a vendor's
      // configured/negotiated rate silently does nothing and every vendor is charged the same.
      const vendor = await findById<Record<string, unknown>>('vendors', vendorId)
      const rawRate = Number(vendor?.commission_rate)
      const commissionRate = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : fallbackRate
      const commission = Math.round(subtotal * commissionRate)
      const vendorPayout = subtotal - commission

      const orderResult = await create<Record<string, unknown>>('orders', {
        buyer_id: userId,
        user_id: userId,
        vendor_id: vendorId,
        status: 'confirmed',
        subtotal,
        commission,
        vendor_payout: vendorPayout,
        total: subtotal,
        currency: process.env.MARKETPLACE_CURRENCY || 'USD',
        shipping_address: shippingAddress ?? null,
        billing_address: billingAddress ?? null,
        payment_id: paymentMethodId ?? null,
      })
      const order = orderResult.data
      if (!order) continue
      const orderId = order.id as string

      for (const item of items) {
        const product = item.product as Record<string, unknown>
        await create('order_items', {
          order_id: orderId,
          product_id: item.product_id,
          vendor_id: vendorId,
          variant_id: item.variant_id ?? null,
          quantity: item.quantity,
          unit_price: product.price ?? 0,
          name: (product.name as string) ?? 'Item',
        })
      }

      await create('commissions', {
        order_id: orderId,
        user_id: userId,
        vendor_id: vendorId,
        amount: commission,
        payout_amount: vendorPayout,
        status: 'pending',
      })

      orders.push(order)
    }

    for (const item of cartItems) {
      await deleteById('cart_items', item.id as string)
    }

    res.status(201).json({ orders })
  } catch (error) {
    return next(error)
  }
})

router.put('/:id/status', validateBody(updateOrderStatusSchema), async (req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const orderId = String(req.params.id)
    const order = await findById<Record<string, unknown>>('orders', orderId)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    const { status } = req.body as z.infer<typeof updateOrderStatusSchema>
    const currentStatus = String(order.status ?? 'pending') as OrderStatus

    // The ONLY lifecycle action a buyer (order owner) may self-service is
    // cancelling their OWN order while it is still pending
    // (BUYER_ALLOWED_TRANSITIONS = { pending: ['cancelled'], ...: [] }).
    // Everything else — confirm/process/ship/deliver/refund (merchant states)
    // and cancelling an already-progressed order — is MERCHANT-only and gated
    // by the registered merchant authorizer (seller/vendor ownership), which
    // fails closed (403) when no authorizer is registered or it denies.
    const buyerAllowed = BUYER_ALLOWED_TRANSITIONS[currentStatus]?.includes(status) ?? false
    if (buyerAllowed) {
      if (order.buyer_id !== userId) {
        return res
          .status(403)
          .json({ error: t('order.error.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
    } else {
      const allowed = await canDriveOrderLifecycle(order as unknown as OrderRow, userId)
      if (!allowed) {
        return res.status(403).json({
          error: t(
            'order.error.merchantForbidden',
            {},
            { defaultValue: 'Merchant authorization is required to manage this order' },
          ),
        })
      }
    }

    const result = await updateById<Record<string, unknown>>('orders', orderId, {
      status,
      updated_at: new Date().toISOString(),
    })
    await create('order_events', { order_id: orderId, status })
    res.json(result.data)
  } catch (error) {
    return next(error)
  }
})

export default router
