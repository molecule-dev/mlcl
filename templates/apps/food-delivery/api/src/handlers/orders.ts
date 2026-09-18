import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { distance } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import {
  BUYER_ALLOWED_ORDER_TRANSITIONS,
  canMerchantManageOrder,
} from '../middleware/order-merchant.js'
import { isOpenNow } from './_hours.js'

const router = Router()

const placeOrderSchema = z.object({
  restaurant_id: z.string().min(1),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().min(1),
        quantity: z.number().int().positive(),
        modifiers: z
          .array(
            z.object({
              name: z.string(),
              option: z.string().optional(),
              price: z.number().nonnegative().optional(),
            }),
          )
          .optional(),
        special_instructions: z.string().optional(),
      }),
    )
    .min(1),
  delivery_address: z.string().min(1),
  delivery_lat: z.number(),
  delivery_lng: z.number(),
  payment_method_id: z.string().optional(),
  special_instructions: z.string().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum([
    'placed',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'delivered',
    'cancelled',
  ]),
})

const cancelSchema = z.object({
  reason: z.string().optional(),
})

const rateSchema = z.object({
  food_rating: z.number().int().min(1).max(5),
  delivery_rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
})

interface DecoratedItem {
  name: string
  qty: number
  price_cents: number
}

interface DecoratedOrder extends Record<string, unknown> {
  restaurant_name: string
  status: string
  placed_at: string
  delivered_at: string | null
  total_cents: number
  subtotal_cents: number
  delivery_fee_cents: number
  service_fee_cents: number
  eta_minutes: number
  driver_name: string | null
  driver_vehicle: string | null
  items: DecoratedItem[]
}

async function decorateOrder(order: Record<string, unknown>): Promise<DecoratedOrder> {
  const items = (await findMany<Record<string, unknown>>('order_items', {
    where: [{ field: 'order_id', operator: '=', value: String(order.id) }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 200,
  })) as Record<string, unknown>[]
  const restaurant = await findById<Record<string, unknown>>(
    'restaurants',
    String(order.restaurant_id),
  )
  const placedAt =
    order.created_at instanceof Date
      ? order.created_at.toISOString()
      : String(order.created_at ?? new Date().toISOString())
  const deliveredAt =
    order.status === 'delivered'
      ? order.updated_at instanceof Date
        ? order.updated_at.toISOString()
        : order.updated_at
          ? String(order.updated_at)
          : placedAt
      : null

  const estimatedDelivery = order.estimated_delivery
  const etaTime =
    estimatedDelivery instanceof Date
      ? estimatedDelivery.getTime()
      : estimatedDelivery
        ? new Date(String(estimatedDelivery)).getTime()
        : null
  const etaMinutes = etaTime != null ? Math.max(0, Math.round((etaTime - Date.now()) / 60000)) : 0

  const subtotal = Number(order.subtotal ?? 0)
  const deliveryFee = Number(order.delivery_fee ?? 0)
  const serviceFee = Number(order.service_fee ?? 0)
  const total = Number(order.total ?? 0)
  const taxCents = Math.max(0, total - subtotal - deliveryFee - serviceFee)

  return {
    ...order,
    restaurant_name: String(restaurant?.name ?? ''),
    address: String(order.delivery_address ?? ''),
    placed_at: placedAt,
    delivered_at: deliveredAt,
    status: String(order.status ?? 'placed'),
    total_cents: total,
    subtotal_cents: subtotal,
    delivery_fee_cents: deliveryFee,
    service_fee_cents: serviceFee,
    tax_cents: taxCents,
    eta_minutes: etaMinutes,
    driver_name: null,
    driver_vehicle: null,
    items: items.map((it) => ({
      name: String(it.name ?? ''),
      qty: Number(it.quantity ?? 1),
      price_cents: Number(it.unit_price ?? 0),
    })),
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { status, page = '1', limit = '20' } = req.query
    const where: WhereCondition[] = [{ field: 'customer_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const orders = (await findMany<Record<string, unknown>>('orders', {
      where,
      orderBy,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })) as Record<string, unknown>[]
    const data = await Promise.all(orders.map((o) => decorateOrder(o)))
    res.json({ data })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
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
    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order || order.customer_id !== userId) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const decorated = await decorateOrder(order)
    res.json({ data: decorated })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(placeOrderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const {
      restaurant_id,
      items,
      delivery_address,
      delivery_lat,
      delivery_lng,
      special_instructions,
    } = req.body

    const restaurant = await findById<Record<string, unknown>>('restaurants', restaurant_id)
    if (!restaurant || restaurant.status !== 'active') {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }
    // Reject orders placed while the restaurant is closed (outside its opening_hours). This was
    // never checked, so a 3am order went through even though the storefront advertises hours.
    if (isOpenNow(restaurant.opening_hours) === false) {
      res.status(400).json({
        error: t('order.restaurantClosed', undefined, {
          defaultValue: 'This restaurant is closed right now.',
        }),
      })
      return
    }

    let distanceKm = 0
    try {
      distanceKm = distance(
        { lat: Number(restaurant.latitude ?? 0), lng: Number(restaurant.longitude ?? 0) },
        { lat: Number(delivery_lat), lng: Number(delivery_lng) },
      )
    } catch (geoErr) {
      logger.warn?.(`distance failed: ${(geoErr as Error).message}`)
    }

    const radiusKm = parseFloat(process.env.DELIVERY_RADIUS_KM || '15')
    if (distanceKm > radiusKm) {
      res.status(400).json({
        error: t('order.tooFar', undefined, {
          defaultValue: 'Delivery address is outside the delivery area',
        }),
      })
      return
    }

    const deliveryFeeBase = parseInt(process.env.DELIVERY_FEE_BASE || '299', 10)
    const deliveryFeePerKm = parseInt(process.env.DELIVERY_FEE_PER_KM || '50', 10)
    const deliveryFee = deliveryFeeBase + Math.round(distanceKm * deliveryFeePerKm)

    let subtotal = 0
    const orderItems: Record<string, unknown>[] = []
    for (const item of items as Array<Record<string, unknown>>) {
      const menuItem = await findById<Record<string, unknown>>(
        'menu_items',
        String(item.menu_item_id),
      )
      if (!menuItem || menuItem.status !== 'available') {
        res.status(400).json({
          error: t(
            'menu.itemUnavailable',
            { item: String(item.menu_item_id) },
            { defaultValue: 'Menu item unavailable' },
          ),
        })
        return
      }
      const qty = Number(item.quantity) || 1
      const itemPrice = Number(menuItem.price ?? 0)
      let modifierTotal = 0
      const selectedModifiers: Array<Record<string, unknown>> = []
      const mods = (item.modifiers as Array<Record<string, unknown>> | undefined) ?? []
      for (const mod of mods) {
        const modPrice = Math.round(Number(mod.price ?? 0) * 100)
        modifierTotal += modPrice
        selectedModifiers.push({ name: mod.name, option: mod.option, price: mod.price })
      }
      const lineTotal = (itemPrice + modifierTotal) * qty
      subtotal += lineTotal
      orderItems.push({
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        quantity: qty,
        unit_price: itemPrice,
        modifiers: selectedModifiers,
        special_instructions: item.special_instructions || '',
        line_total: lineTotal,
      })
    }

    const minimumOrder = Number(restaurant.minimum_order ?? 0)
    if (subtotal < minimumOrder) {
      res.status(400).json({
        error: t('order.belowMinimum', undefined, {
          defaultValue: 'Order does not meet the minimum amount',
        }),
        minimumOrder: minimumOrder / 100,
      })
      return
    }

    const serviceFeePercent = parseFloat(process.env.SERVICE_FEE_PERCENT || '0.15')
    const serviceFee = Math.round(subtotal * serviceFeePercent)
    const total = subtotal + deliveryFee + serviceFee
    const prepTime = Number(restaurant.estimated_delivery_min ?? 30)
    const deliveryMin = Math.max(0, Math.round(distanceKm * 3))
    const estimatedMinutes = prepTime + deliveryMin
    const estimatedDelivery = new Date(Date.now() + estimatedMinutes * 60_000)

    const result = await create<Record<string, unknown>>('orders', {
      customer_id: userId,
      restaurant_id,
      status: 'placed',
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      total,
      currency: process.env.DEFAULT_CURRENCY || 'USD',
      delivery_address,
      delivery_lat: Number(delivery_lat),
      delivery_lng: Number(delivery_lng),
      special_instructions: special_instructions || '',
      estimated_delivery: estimatedDelivery,
      distance_km: distanceKm,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const order = result.data as Record<string, unknown> | undefined
    const orderId = order?.id ? String(order.id) : ''
    if (orderId) {
      for (const oi of orderItems) {
        await create('order_items', { order_id: orderId, ...oi, created_at: new Date() })
      }
      const decorated = await decorateOrder({ ...(order ?? {}), id: orderId })
      // Seed an order_status notification so the user sees a real entry on /notifications.
      try {
        await create('notifications', {
          user_id: userId,
          type: 'order_status',
          title: t('order.placed', undefined, { defaultValue: 'Order placed' }),
          body: `${decorated.restaurant_name || 'Your order'} is being prepared.`,
          payload: JSON.stringify({ href: `/order/${orderId}`, orderId, status: 'placed' }),
          read_at: null,
        })
      } catch (_error) {
        // best effort — notification failure must not block the order response
      }
      res.status(201).json({ data: { ...decorated, estimatedDelivery, estimatedMinutes } })
      return
    }
    res
      .status(201)
      .json({ data: { ...(order ?? {}), items: orderItems, estimatedDelivery, estimatedMinutes } })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Advance an order's status. This is the MERCHANT (restaurant) endpoint: every
 * transition into a merchant-driven state (confirmed/preparing/ready/delivered)
 * is gated to the restaurant owner via the registered merchant authorizer and
 * fails CLOSED (403) when no authorizer approves the caller. The order OWNER
 * (buyer) is NOT a merchant and may not drive these — their only self-service
 * lifecycle action is cancelling a still-`placed` order (see `cancelOrder`).
 */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const { status } = req.body as { status: string }
    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }

    const currentStatus = String(order.status)
    const buyerAllowed = (BUYER_ALLOWED_ORDER_TRANSITIONS[currentStatus] ?? []).includes(status)
    if (buyerAllowed) {
      // Buyer-reachable transition (cancelling a still-`placed` order) — the
      // order owner self-enforces; anyone else is forbidden.
      if (order.customer_id !== userId) {
        res.status(403).json({
          error: t('order.error.forbidden', undefined, {
            defaultValue: 'You do not have access to this order',
          }),
          errorKey: 'order.error.forbidden',
        })
        return
      }
    } else {
      // Transition into a MERCHANT-driven state — fail-closed merchant gate.
      if (!(await canMerchantManageOrder(order, userId))) {
        res.status(403).json({
          error: t('order.error.merchantForbidden', undefined, {
            defaultValue: 'Merchant authorization is required to manage this order',
          }),
          errorKey: 'order.error.merchantForbidden',
        })
        return
      }
    }

    const updated = await updateById('orders', id, { status, updated_at: new Date() })
    res.json(updated.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}

router.put('/:id/status', validateBody(updateStatusSchema), updateOrderStatus)

/**
 * Cancel an order. A BUYER (order owner) may cancel only their OWN still-`placed`
 * order — the one buyer self-service lifecycle action. Once the order has
 * progressed past `placed` (the restaurant confirmed it), cancellation is
 * merchant-only and gated to the restaurant owner via the merchant authorizer
 * (fails CLOSED with 403 when none approves the caller).
 */
export async function cancelOrder(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }

    const currentStatus = String(order.status)
    const buyerMayCancel = (BUYER_ALLOWED_ORDER_TRANSITIONS[currentStatus] ?? []).includes(
      'cancelled',
    )
    if (buyerMayCancel) {
      // Buyer may cancel only their OWN still-`placed` order.
      if (order.customer_id !== userId) {
        res.status(403).json({
          error: t('order.error.forbidden', undefined, {
            defaultValue: 'You do not have access to this order',
          }),
          errorKey: 'order.error.forbidden',
        })
        return
      }
    } else {
      // Order already progressed past `placed` — cancellation is merchant-only.
      if (!(await canMerchantManageOrder(order, userId))) {
        res.status(403).json({
          error: t('order.error.merchantForbidden', undefined, {
            defaultValue: 'Merchant authorization is required to manage this order',
          }),
          errorKey: 'order.error.merchantForbidden',
        })
        return
      }
    }

    // A finished order can no longer be cancelled by anyone.
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
      res.status(400).json({
        error: t('order.cannotCancel', undefined, {
          defaultValue: 'Order cannot be cancelled at this stage',
        }),
      })
      return
    }

    await updateById('orders', id, { status: 'cancelled', updated_at: new Date() })
    res.json({
      message: t('order.cancelled', undefined, { defaultValue: 'Order cancelled and refunded' }),
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}

router.post('/:id/cancel', validateBody(cancelSchema), cancelOrder)

router.post('/:id/rate', validateBody(rateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const { food_rating, delivery_rating, comment } = req.body as Record<string, unknown>

    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order || order.customer_id !== userId) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    if (order.status !== 'delivered') {
      res.status(400).json({
        error: t('order.notDelivered', undefined, {
          defaultValue: 'Can only rate delivered orders',
        }),
      })
      return
    }

    const review = await create('order_reviews', {
      order_id: id,
      customer_id: userId,
      restaurant_id: order.restaurant_id,
      driver_id: order.driver_id ?? null,
      food_rating: Number(food_rating),
      delivery_rating: delivery_rating != null ? Number(delivery_rating) : null,
      comment: (comment as string | undefined) || '',
      created_at: new Date(),
    })

    const reviews = (await findMany<Record<string, unknown>>('order_reviews', {
      where: [{ field: 'restaurant_id', operator: '=', value: String(order.restaurant_id) }],
      limit: 1000,
    })) as Record<string, unknown>[]
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + Number(r.food_rating ?? 0), 0) / reviews.length
      await updateById('restaurants', String(order.restaurant_id), {
        rating: Math.round(avg * 10) / 10,
        review_count: reviews.length,
        updated_at: new Date(),
      })
    }
    res.status(201).json(review.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
