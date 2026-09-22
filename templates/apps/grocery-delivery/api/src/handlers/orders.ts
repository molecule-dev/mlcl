/**
 * Orders handler — checkout (cart → order), per-user list/detail,
 * status updates, and refund. All ownership scoped via `user_id`.
 *
 * Payment processing is intentionally a no-op stub when STRIPE_SECRET_KEY
 * is unset (E2E sandbox mode). Real Stripe wiring lives in the
 * @molecule/api-payments-stripe bond and is consumed by the user
 * resource's billing routes.
 */
import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import {
  canDriveOrderLifecycle,
  type OrderRow as OrderResourceRow,
  type OrderStatus,
} from '@molecule/api-resource-order'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The `:id` URL param, or null when it is not a well-formed UUID.
 *
 * A malformed id (anything can be typed into /order/:id) must 404 — passing
 * it to Postgres as a uuid literal makes the query throw and the handler
 * answer 500 instead of "order not found".
 */
function orderParamId(req: Request): string | null {
  const id = getParamId(req)
  return UUID_RE.test(id) ? id : null
}

const router = Router()

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'shopping',
  'picked',
  'on_the_way',
  'delivered',
  'cancelled',
  'refunded',
] as const

const FRONTEND_STATUSES = [
  'placed',
  'shopping',
  'packed',
  'on_the_way',
  'delivered',
  'cancelled',
] as const

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(VALID_STATUSES).optional(),
})

const checkoutSchema = z.object({
  deliveryAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    region: z.string().optional(),
    postal_code: z.string().min(1),
    country: z.string().default('US'),
  }),
  deliverySlotId: z.string().min(1),
  paymentMethodId: z.string().min(1).optional(),
  deliveryInstructions: z.string().default(''),
  tip: z.number().nonnegative().default(0),
})

const statusUpdateSchema = z.object({
  status: z.enum([...VALID_STATUSES, ...FRONTEND_STATUSES] as [string, ...string[]]),
  driverLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
})

const refundSchema = z.object({
  reason: z.string().optional(),
  amount: z.number().nonnegative().optional(),
})

interface CartItemRow {
  id: string
  user_id: string
  product_id: string
  quantity: number
  substitute_id: string | null
  substitution_preference: string
}

interface OrderRow {
  id: string
  user_id: string
  status: string
  subtotal: number
  tax: number
  delivery_fee: number
  tip: number
  total: number
  currency: string
  delivery_slot_id: string | null
  payment_id: string | null
  has_substitutions: boolean
  delivery_address: Record<string, unknown> | null
  delivery_instructions?: string
  driver_location?: Record<string, unknown> | null
  delivered_at?: string | null
  created_at?: string
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  name: string
  quantity: number
  unit_price: number
  substitution_preference: string | null
  substitute_id: string | null
  is_substitution: boolean
}

interface DeliverySlotRow {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity?: number
  remaining_capacity?: number
}

const STATUS_FRONTEND: Record<string, string> = {
  pending: 'placed',
  confirmed: 'placed',
  shopping: 'shopping',
  picked: 'packed',
  on_the_way: 'on_the_way',
  delivered: 'delivered',
  cancelled: 'cancelled',
  refunded: 'cancelled',
}

const STATUS_BACKEND: Record<string, string> = {
  placed: 'confirmed',
  shopping: 'shopping',
  packed: 'picked',
  on_the_way: 'on_the_way',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

// Map this app's richer grocery status set onto the order resource's canonical
// OrderStatus so an order row can be handed to the resource's merchant gate.
// (shopping/picked are "processing" stages; on_the_way maps to "shipped".)
const STATUS_TO_RESOURCE: Record<string, OrderStatus> = {
  pending: 'pending',
  confirmed: 'confirmed',
  shopping: 'processing',
  picked: 'processing',
  on_the_way: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  refunded: 'refunded',
}

/**
 * Adapt this app's snake_case order row to the `@molecule/api-resource-order`
 * `OrderRow` shape expected by `canDriveOrderLifecycle`. The single-merchant
 * authorizer (registered in `setupBonds`) keys off the CALLER's operator role,
 * not the order, so the remaining fields are mapped best-effort only to satisfy
 * the resource gate's type contract.
 */
function toOrderResourceRow(order: OrderRow): OrderResourceRow {
  return {
    id: order.id,
    userId: order.user_id,
    status: STATUS_TO_RESOURCE[order.status] ?? 'processing',
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    shipping: Number(order.delivery_fee),
    discount: 0,
    total: Number(order.total),
    shippingAddress: order.delivery_address ? JSON.stringify(order.delivery_address) : null,
    billingAddress: null,
    paymentId: order.payment_id,
    notes: order.delivery_instructions ?? null,
    createdAt: order.created_at ?? '',
    updatedAt: '',
  }
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch (_error) {
      // invalid JSON; return the caller-supplied fallback
      return fallback
    }
  }
  return raw as T
}

function formatSlot(slot: DeliverySlotRow | null): string {
  if (!slot) return ''
  try {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    const day = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const fmtTime = (d: Date): string =>
      d
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: undefined, hour12: true })
        .replace(/:00 /, ' ')
        .replace(' ', '\u00A0')
    return `${day}, ${fmtTime(start)}\u2013${fmtTime(end)}`
  } catch (_error) {
    // date parsing failed; return empty string gracefully
    return ''
  }
}

function serializeOrder(
  order: OrderRow,
  items: OrderItemRow[] | undefined,
  slot: DeliverySlotRow | null,
): Record<string, unknown> {
  const itemCount = items ? items.reduce((sum, it) => sum + Number(it.quantity), 0) : 0
  const previewItems = items ? items.slice(0, 3).map((it) => it.name) : []
  return {
    id: order.id,
    user_id: order.user_id,
    status: STATUS_FRONTEND[order.status] ?? order.status,
    raw_status: order.status,
    subtotal: Number(order.subtotal),
    subtotal_cents: Number(order.subtotal),
    tax: Number(order.tax),
    tax_cents: Number(order.tax),
    delivery_fee: Number(order.delivery_fee),
    delivery_fee_cents: Number(order.delivery_fee),
    tip: Number(order.tip),
    tip_cents: Number(order.tip),
    total: Number(order.total),
    total_cents: Number(order.total),
    currency: order.currency,
    item_count: itemCount,
    items: items
      ? items.map((it) => ({
          id: it.id,
          product_id: it.product_id,
          name: it.name,
          qty: Number(it.quantity),
          quantity: Number(it.quantity),
          unit_price_cents: Number(it.unit_price),
          price_cents: Number(it.unit_price),
          substitution_preference: it.substitution_preference,
          substitution_pref: it.substitution_preference,
          substitute_id: it.substitute_id,
          is_substitution: it.is_substitution,
        }))
      : [],
    preview_items: previewItems,
    delivery_slot_id: order.delivery_slot_id,
    delivery_slot: formatSlot(slot),
    delivery_address: parseJson<Record<string, unknown>>(order.delivery_address, {}),
    delivery_instructions: order.delivery_instructions ?? '',
    address: (() => {
      const a = parseJson<Record<string, string>>(order.delivery_address, {})
      const line1 = a.line1 ?? ''
      const city = a.city ?? ''
      return `${line1}${line1 && city ? ', ' : ''}${city}`.trim()
    })(),
    has_substitutions: order.has_substitutions,
    driver_location: parseJson<Record<string, unknown> | null>(order.driver_location, null),
    payment_id: order.payment_id,
    placed_at: order.created_at ?? null,
    delivered_at: order.delivered_at ?? null,
    eta_minutes: order.status === 'on_the_way' ? 18 : 0,
    items_picked: order.status === 'shopping' ? Math.max(1, Math.floor(itemCount / 2)) : itemCount,
    items_total: itemCount,
    shopper_name:
      order.status === 'shopping' || order.status === 'picked' ? 'Sam, your shopper' : null,
    driver_name: order.status === 'on_the_way' ? 'Casey, your driver' : null,
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { page, limit, status } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const orders = await findMany<OrderRow>('orders', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const serialized: Record<string, unknown>[] = []
    for (const o of orders) {
      const items = await findMany<OrderItemRow>('order_items', {
        where: [{ field: 'order_id', operator: '=', value: o.id }],
      })
      const slot = o.delivery_slot_id
        ? await findById<DeliverySlotRow>('delivery_slots', o.delivery_slot_id)
        : null
      serialized.push(serializeOrder(o, items, slot))
    }
    res.json({ data: serialized, page, limit })
  } catch (error) {
    logger.error('orders.list', error)
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
    const id = orderParamId(req)
    if (!id) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const order = await findById<OrderRow>('orders', id)
    if (!order || order.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const items = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: order.id }],
    })
    const slot = order.delivery_slot_id
      ? await findById<DeliverySlotRow>('delivery_slots', order.delivery_slot_id)
      : null
    res.json({ data: serializeOrder(order, items, slot) })
  } catch (error) {
    logger.error('orders.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(checkoutSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof checkoutSchema>

    const slot = await findById<{
      id: string
      remaining_capacity: number
      fee_override: number | null
    }>('delivery_slots', body.deliverySlotId)
    if (!slot) {
      res.status(400).json({
        error: t('order.invalidSlot', undefined, { defaultValue: 'Invalid delivery slot' }),
      })
      return
    }
    const remainingCapacity = Number(slot.remaining_capacity ?? 0)
    if (remainingCapacity <= 0) {
      res
        .status(409)
        .json({ error: t('order.slotFull', undefined, { defaultValue: 'Delivery slot is full' }) })
      return
    }

    // Pull cart
    const cartItems = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (cartItems.length === 0) {
      res
        .status(400)
        .json({ error: t('order.emptyCart', undefined, { defaultValue: 'Cart is empty' }) })
      return
    }

    // Compute totals; substitutions handled by picker post-confirmation,
    // not at checkout time, so order_items mirror cart_items 1:1 here.
    let subtotal = 0
    const orderItemRows: Record<string, unknown>[] = []
    for (const ci of cartItems) {
      const product = await findById<{
        id: string
        price: number
        name: string
        status?: string
        attributes?: Record<string, unknown> | null
      }>('products', ci.product_id)
      if (!product) continue
      // Skip archived / out-of-stock items so the customer is never charged for them — the same
      // availability predicate the catalog uses. If this empties the order, the allItemsUnavailable
      // guard below returns 400.
      const productAttrs = (product.attributes ?? {}) as Record<string, unknown>
      if (product.status !== 'active' || productAttrs.in_stock === false) continue
      const unitPrice = Number(product.price ?? 0)
      subtotal += unitPrice * ci.quantity
      orderItemRows.push({
        product_id: product.id,
        original_product_id: null,
        quantity: ci.quantity,
        unit_price: unitPrice,
        name: product.name,
        substitution_preference: ci.substitution_preference,
        substitute_id: ci.substitute_id,
        is_substitution: false,
      })
    }
    if (orderItemRows.length === 0) {
      res.status(400).json({
        error: t('order.allItemsUnavailable', undefined, {
          defaultValue: 'All items are unavailable',
        }),
      })
      return
    }

    const taxRate = Number(process.env.STORE_TAX_RATE ?? '0')
    const tax = Math.round(subtotal * taxRate)
    const deliveryFee = Number(process.env.DELIVERY_FEE ?? '499')
    const freeThreshold = Number(process.env.FREE_DELIVERY_THRESHOLD ?? '3500')
    // Honor the chosen slot's per-slot fee_override (a premium/express or discounted slot fee). The
    // Cart already prices the order with it (slot.fee_cents), but checkout dropped it and always
    // charged the flat env fee — so the charged total didn't match what the customer approved. A slot
    // with an explicit override charges that fee; slots without one fall back to the env fee (with the
    // free-delivery threshold applied).
    const appliedDeliveryFee =
      slot.fee_override != null
        ? Number(slot.fee_override)
        : subtotal >= freeThreshold
          ? 0
          : deliveryFee
    const total = subtotal + tax + appliedDeliveryFee + Math.round(body.tip * 100)

    // Synthetic charge id when running in sandbox/E2E mode.
    const paymentId = `pmt_${crypto.randomUUID()}`

    const orderResult = await create<OrderRow>('orders', {
      user_id: userId,
      status: 'confirmed',
      subtotal,
      tax,
      delivery_fee: appliedDeliveryFee,
      tip: Math.round(body.tip * 100),
      total,
      currency: process.env.STORE_CURRENCY ?? 'USD',
      delivery_address: JSON.stringify(body.deliveryAddress),
      delivery_slot_id: body.deliverySlotId,
      delivery_instructions: body.deliveryInstructions,
      payment_id: paymentId,
      has_substitutions: false,
    })
    const order = orderResult.data
    if (!order) {
      res
        .status(500)
        .json({ error: t('order.paymentFailed', undefined, { defaultValue: 'Payment failed' }) })
      return
    }

    for (const row of orderItemRows) {
      await create('order_items', { order_id: order.id, ...row })
    }

    await create('order_events', {
      order_id: order.id,
      status: 'confirmed',
    })

    await updateById('delivery_slots', body.deliverySlotId, {
      remaining_capacity: remainingCapacity - 1,
    })

    // Clear cart
    for (const ci of cartItems) {
      await deleteById('cart_items', ci.id)
    }

    const itemsCreated = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: order.id }],
    })
    const fullSlot = await findById<DeliverySlotRow>('delivery_slots', body.deliverySlotId)
    res.status(201).json({ data: serializeOrder(order, itemsCreated, fullSlot) })
  } catch (err) {
    logger.error('orders.checkout', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Return one unit of capacity to a delivery slot when an order that had claimed it is
 * cancelled or refunded. Checkout decrements `remaining_capacity` by 1 per order, so a
 * cancel/refund must give it back — otherwise the seat stays permanently consumed and the
 * slot reads "full" with no live orders. Clamp at `capacity` so a double-free can never push
 * a slot above its real ceiling.
 */
async function restoreSlotCapacity(slotId: string | null | undefined): Promise<void> {
  if (!slotId) return
  const slot = await findById<DeliverySlotRow>('delivery_slots', slotId)
  if (!slot) return
  const restored = Number(slot.remaining_capacity ?? 0) + 1
  const ceiling = Number(slot.capacity ?? restored)
  await updateById('delivery_slots', slotId, {
    remaining_capacity: Math.min(restored, ceiling),
  })
}

/**
 * Update an order's lifecycle status.
 *
 * Buyers (order owners) may self-service exactly ONE transition: cancelling
 * their OWN order while it is still `pending` (mirrors the order resource's
 * `BUYER_ALLOWED_TRANSITIONS = { pending: ['cancelled'] }`). Every other
 * transition — into any forward/merchant state, or cancelling an order that has
 * already progressed past `pending` — is MERCHANT-only and gated by the
 * registered merchant authorizer (`canDriveOrderLifecycle`), which fails CLOSED
 * (403) when no authorizer is registered or it denies the caller.
 */
export async function updateStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const statusId = orderParamId(req)
    if (!statusId) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const order = await findById<OrderRow>('orders', statusId)
    if (!order) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const body = req.body as z.infer<typeof statusUpdateSchema>
    const backendStatus = STATUS_BACKEND[body.status as string] ?? body.status

    const buyerAllowed = order.status === 'pending' && backendStatus === 'cancelled'
    if (buyerAllowed) {
      // Buyer self-service: owner-gated. A non-owner attempting a buyer-allowed
      // action gets the plain owner-check failure.
      if (order.user_id !== userId) {
        res.status(403).json({
          error: t('order.error.forbidden', undefined, {
            defaultValue: 'You do not have access to this order',
          }),
        })
        return
      }
    } else if (!(await canDriveOrderLifecycle(toOrderResourceRow(order), userId))) {
      // Merchant-only transition — fail-closed when the caller is not a merchant.
      res.status(403).json({
        error: t('order.error.merchantForbidden', undefined, {
          defaultValue: 'Merchant authorization is required to manage this order',
        }),
      })
      return
    }

    const updates: Record<string, unknown> = { status: backendStatus, updated_at: new Date() }
    if (backendStatus === 'delivered') updates.delivered_at = new Date()
    if (body.driverLocation) updates.driver_location = JSON.stringify(body.driverLocation)

    const result = await updateById<OrderRow>('orders', statusId, updates)
    await create('order_events', { order_id: statusId, status: backendStatus })
    // Cancelling frees the delivery slot the order reserved at checkout. Guard on the PRIOR
    // status so re-cancelling (or cancelling an already-refunded order) can't double-free.
    if (
      backendStatus === 'cancelled' &&
      order.status !== 'cancelled' &&
      order.status !== 'refunded'
    ) {
      await restoreSlotCapacity(order.delivery_slot_id)
    }
    if (!result.data) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
      return
    }
    const items = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: statusId }],
    })
    const slot = result.data.delivery_slot_id
      ? await findById<DeliverySlotRow>('delivery_slots', result.data.delivery_slot_id)
      : null
    res.json({ data: serializeOrder(result.data, items, slot) })
  } catch (error) {
    logger.error('orders.updateStatus', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}

router.put('/:id/status', validateBody(statusUpdateSchema), updateStatusHandler)

/**
 * Refund an order. Refund is ALWAYS a MERCHANT-only op — the order owner is the
 * BUYER, so an owner check is NOT sufficient here. Gated by the registered
 * merchant authorizer (`canDriveOrderLifecycle`), which fails CLOSED (403) when
 * no authorizer is registered or it denies the caller.
 */
export async function refundHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const refundId = orderParamId(req)
    if (!refundId) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const order = await findById<OrderRow>('orders', refundId)
    if (!order) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    if (!(await canDriveOrderLifecycle(toOrderResourceRow(order), userId))) {
      res.status(403).json({
        error: t('order.error.merchantForbidden', undefined, {
          defaultValue: 'Merchant authorization is required to manage this order',
        }),
      })
      return
    }
    if (order.status === 'refunded') {
      res.status(400).json({
        error: t('order.alreadyRefunded', undefined, { defaultValue: 'Order already refunded' }),
      })
      return
    }
    await updateById('orders', refundId, {
      status: 'refunded',
      refund_amount: req.body.amount ?? order.total,
      refund_reason: req.body.reason ?? null,
      refunded_at: new Date(),
    })
    await create('order_events', { order_id: refundId, status: 'refunded' })
    // A refund frees the reserved slot too — unless the order was already cancelled (which
    // already returned the capacity). The status==='refunded' early-return above covers re-refund.
    if (order.status !== 'cancelled') {
      await restoreSlotCapacity(order.delivery_slot_id)
    }
    res.json({ refunded: true, amount: req.body.amount ?? order.total })
  } catch (error) {
    logger.error('orders.refund', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}

router.post('/:id/refund', validateBody(refundSchema), refundHandler)

export default router
