/**
 * Orders handler — `/api/orders/*`. Real Stripe Checkout for paid
 * tickets; immediate fulfillment for free tier orders.
 *
 * Flow:
 *   POST /api/orders          → create order; if total>0, return Stripe
 *                               Checkout session URL. Order starts in
 *                               'pending' until the webhook (or simulate)
 *                               flips it to 'paid' and issues tickets.
 *   POST /api/orders/webhook  → Stripe-signed webhook receiver. Marks
 *                               the order paid and issues tickets.
 *   POST /api/orders/simulate → dev/test-only fulfillment (NODE_ENV !=
 *                               production). Lets e2e + manual smoke
 *                               work without forwarding Stripe webhooks
 *                               to localhost.
 *   GET  /api/orders          → list current user's orders.
 *   GET  /api/orders/:id      → buyer or event-organizer view.
 *   PUT  /api/orders/:id/refund → organizer marks an order refunded.
 */
import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { getClient, verifyWebhookSignature } from '@molecule/api-payments-stripe'

const router = Router()

// Confirmation codes and TX reference codes are attendee-presented
// credentials — support and lookup flows key off them, so they must not be
// guessable. Math.random is a predictable non-cryptographic PRNG; draw from
// a CSPRNG instead. [L2-1]
function randomCode(length: number, alphabet: string): string {
  // Rejection sampling keeps every symbol equally likely: skip byte values
  // above the largest multiple of the alphabet size (a plain modulo would
  // favor the earliest characters).
  const limit = 256 - (256 % alphabet.length)
  let result = ''
  while (result.length < length) {
    const buf = randomBytes(16)
    for (let i = 0; i < buf.length && result.length < length; i++) {
      if (buf[i]! < limit) result += alphabet.charAt(buf[i]! % alphabet.length)
    }
  }
  return result
}

function generateConfirmationCode(): string {
  return randomCode(10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
}

function generateRefCode(): string {
  return `TX-${randomCode(5, '0123456789')}`
}

const listQuerySchema = z.object({
  event_id: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

const createOrderSchema = z.object({
  event_id: z.string().min(1),
  tier_id: z.string().min(1),
  quantity: z.number().int().min(1),
})

const simulateSchema = z
  .object({
    order_id: z.string().min(1).optional(),
    session_id: z.string().min(1).optional(),
  })
  .refine((v) => v.order_id != null || v.session_id != null, {
    message: 'order_id or session_id required',
  })

/** Idempotently fulfill an order: mark paid, issue one ticket per
 *  quantity unit. Safe to call twice (Stripe webhook can redeliver). */
export async function fulfillOrder(orderId: string): Promise<{
  order: Record<string, unknown>
  tickets: Array<Record<string, unknown>>
}> {
  const order = await findById<Record<string, unknown>>('orders', orderId)
  if (!order) throw new Error(`Order ${orderId} not found at fulfillment time`)

  // Idempotency: if already paid, just return existing tickets.
  if (order.status === 'paid') {
    const existing = await findMany<Record<string, unknown>>('tickets', {
      where: [{ field: 'order_id', operator: '=', value: orderId }],
      limit: 50,
    })
    return { order, tickets: existing }
  }

  const userId = String(order.user_id)
  const eventId = String(order.event_id)
  const tierId = order.tier_id != null ? String(order.tier_id) : null
  const quantity = Number(order.quantity ?? 1)

  // Enforce the tier capacity. POST / checks `quantity_total - quantity_sold`, but
  // `quantity_sold` was never incremented, so the cap NEVER applied (unlimited
  // oversell). Claim it here — when tickets are actually issued, exactly once per
  // order (the `status === 'paid'` idempotency guard above already returned for a
  // re-delivered webhook). The conditional UPDATE is atomic, so concurrent orders
  // can't push `quantity_sold` past `quantity_total`. If a genuine race for the last
  // few tickets slips past the best-effort pre-check we still honor this PAID order
  // (never strand a payer) but log the oversell so the organizer sees it — and future
  // orders correctly clamp to sold-out. Hard-cap venues can tighten this to reject +
  // refund the order instead of honoring it.
  if (tierId) {
    const claimed = await query(
      `UPDATE ticket_tiers SET quantity_sold = quantity_sold + $1
         WHERE id = $2 AND quantity_sold + $1 <= quantity_total`,
      [quantity, tierId],
    )
    if (!claimed.rowCount) {
      logger.warn('ticket tier oversold at fulfillment — honoring paid order', {
        orderId,
        tierId,
        quantity,
      })
      await query('UPDATE ticket_tiers SET quantity_sold = quantity_sold + $1 WHERE id = $2', [
        quantity,
        tierId,
      ])
    }
  }

  // Keep the event-level sold counter in step with the tier counter. The event list/landing/
  // dashboard cards read `events.tickets_sold` to show remaining/sold-out, but it was hardcoded 0
  // at creation and never incremented here — so the indicator was permanently "available". Runs
  // once per order (the paid-status idempotency guard above already returned for a re-delivered
  // webhook); applies to every fulfilled order, tiered or not.
  await query('UPDATE events SET tickets_sold = tickets_sold + $1 WHERE id = $2', [
    quantity,
    eventId,
  ])

  const tickets: Array<Record<string, unknown>> = []
  for (let i = 0; i < quantity; i++) {
    const refCode = generateRefCode()
    const issuedAt = new Date().toISOString()
    const qrPayload = Buffer.from(
      JSON.stringify({ order_id: orderId, event_id: eventId, ref: refCode, issued_at: issuedAt }),
    ).toString('base64url')
    const ticketResult = await create('tickets', {
      user_id: userId,
      order_id: orderId,
      event_id: eventId,
      tier_id: tierId,
      ref_code: refCode,
      qr_payload: qrPayload,
      status: 'issued',
      transferable: true,
      created_at: new Date(),
    })
    if (ticketResult.data) tickets.push(ticketResult.data as Record<string, unknown>)
  }

  const updated = await updateById<Record<string, unknown>>('orders', orderId, {
    status: 'paid',
    updated_at: new Date(),
  })
  return { order: (updated.data ?? order) as Record<string, unknown>, tickets }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { event_id, page = '1', limit = '20' } = req.query as Record<string, string | undefined>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (event_id) where.push({ field: 'event_id', operator: '=', value: event_id })
    const orders = await findMany('orders', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(limit) || 20,
      offset: (Number(page) - 1) * (Number(limit) || 20),
    })
    res.json(orders)
  } catch (err) {
    logger.error('orders GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
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
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    let canRead = order.user_id === userId
    if (!canRead && order.event_id) {
      const event = await findById<Record<string, unknown>>('events', String(order.event_id))
      canRead = !!event && (event.organizer_user_id === userId || event.user_id === userId)
    }
    if (!canRead) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    res.json(order)
  } catch (err) {
    logger.error('orders GET :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createOrderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { event_id, tier_id, quantity } = req.body as z.infer<typeof createOrderSchema>

    const event = await findById<Record<string, unknown>>('events', event_id)
    if (!event) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    if (event.status !== 'published') {
      return res
        .status(400)
        .json({ error: t('event.notPublished', {}, { defaultValue: 'Event is not on sale' }) })
    }

    const tier = await findById<Record<string, unknown>>('ticket_tiers', tier_id)
    if (!tier || tier.event_id !== event_id) {
      return res
        .status(404)
        .json({ error: t('ticket.tierNotFound', {}, { defaultValue: 'Ticket tier not found' }) })
    }

    const tierAvailable = Math.max(
      0,
      Number(tier.quantity_total ?? 0) - Number(tier.quantity_sold ?? 0),
    )
    if (tierAvailable < quantity) {
      return res.status(409).json({
        error: t(
          'ticket.tierSoldOut',
          {},
          { defaultValue: 'Not enough tickets available at this tier' },
        ),
      })
    }

    const subtotal = Number(tier.price_cents) * quantity
    const fees = Math.round(subtotal * 0.05)
    const total = subtotal + fees
    const currency = String(event.currency ?? 'USD')

    // Free order — fulfill immediately, no Stripe round-trip.
    if (total === 0) {
      const orderResult = await create<Record<string, unknown>>('orders', {
        user_id: userId,
        event_id,
        tier_id,
        quantity,
        subtotal_cents: subtotal,
        fees_cents: fees,
        total_cents: total,
        currency,
        stripe_payment_intent_id: null,
        status: 'pending',
        confirmation_code: generateConfirmationCode(),
        checked_in: false,
        created_at: new Date(),
      })
      const order = orderResult.data as Record<string, unknown> | null
      if (!order || !order.id) {
        return res
          .status(500)
          .json({ error: t('order.createFailed', {}, { defaultValue: 'Order creation failed' }) })
      }
      const fulfilled = await fulfillOrder(String(order.id))
      return res.status(201).json({ ...fulfilled.order, tickets: fulfilled.tickets })
    }

    // Paid order: create order in 'pending' status, then a Stripe
    // Checkout session whose metadata pins it to this order.
    const orderResult = await create<Record<string, unknown>>('orders', {
      user_id: userId,
      event_id,
      tier_id,
      quantity,
      subtotal_cents: subtotal,
      fees_cents: fees,
      total_cents: total,
      currency,
      stripe_payment_intent_id: null,
      status: 'pending',
      confirmation_code: generateConfirmationCode(),
      checked_in: false,
      created_at: new Date(),
    })
    const order = orderResult.data as Record<string, unknown> | null
    if (!order || !order.id) {
      return res
        .status(500)
        .json({ error: t('order.createFailed', {}, { defaultValue: 'Order creation failed' }) })
    }

    const origin =
      (req.headers.origin as string | undefined) ??
      `${req.protocol}://${req.get('host') ?? 'localhost'}`

    try {
      const session = await getClient().checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Number(tier.price_cents),
              product_data: {
                name: `${event.title as string} — ${tier.name as string}`,
                ...(tier.description ? { description: String(tier.description) } : {}),
              },
            },
          },
          ...(fees > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: currency.toLowerCase(),
                    unit_amount: fees,
                    product_data: { name: 'Service fee' },
                  },
                },
              ]
            : []),
        ],
        success_url: `${origin}/orders/${order.id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/events/${event_id}?canceled=1`,
        metadata: {
          orderId: String(order.id),
          userId,
          eventId: String(event_id),
          tierId: String(tier_id),
        },
      })
      await updateById('orders', String(order.id), {
        stripe_payment_intent_id: session.id,
        updated_at: new Date(),
      })
      return res.status(201).json({
        ...order,
        stripe_payment_intent_id: session.id,
        checkoutUrl: session.url,
        sessionId: session.id,
        tickets: [],
      })
    } catch (stripeErr) {
      logger.error('Stripe checkout session creation failed', stripeErr)
      return res.status(502).json({
        error: t('order.stripeError', {}, { defaultValue: 'Could not start checkout' }),
        detail: stripeErr instanceof Error ? stripeErr.message : undefined,
      })
    }
  } catch (err) {
    logger.error('orders POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Stripe webhook receiver. Uses `req.rawBody` (set by the body-parser
 * middleware via the `verify` callback) so signature verification sees
 * the unparsed body even though Express has already JSON-parsed it.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string | undefined
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }
  const rawBody = (req as Request & { rawBody?: string }).rawBody
  if (!rawBody) {
    res.status(400).json({ error: 'Missing raw body for webhook verification' })
    return
  }
  let event
  try {
    event = verifyWebhookSignature(Buffer.from(rawBody, 'utf8'), signature)
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Record<string, unknown>
      const metadata = (session.metadata as Record<string, string> | null) ?? {}
      const orderId = metadata.orderId
      if (orderId) {
        await fulfillOrder(orderId)
      } else {
        logger.error('checkout.session.completed missing metadata.orderId', { session })
      }
    }
  } catch (err) {
    logger.error('orders webhook fulfillment failed', err)
    res.status(500).json({ error: 'Webhook processing failed' })
    return
  }
  res.json({ received: true })
})

/**
 * Test-only endpoint to simulate Stripe webhook delivery for a session
 * or directly for a pending orderId. Used by e2e + the confirmation
 * page when running locally without Stripe webhook forwarding.
 *
 * Disabled in production. The real production path is the webhook.
 */
router.post('/simulate', validateBody(simulateSchema), async (req: Request, res: Response) => {
  // Fail CLOSED: this test seam marks the order paid + issues tickets with NO payment
  // verification, so it must be off by default. Gating on NODE_ENV was fail-OPEN
  // (scaffold ships NODE_ENV=development → live payment bypass). [P5TPL-1/RVALL]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { order_id, session_id } = req.body as z.infer<typeof simulateSchema>
    let orderId: string | null = order_id ?? null
    if (!orderId && session_id) {
      const matches = await findMany<Record<string, unknown>>('orders', {
        where: [{ field: 'stripe_payment_intent_id', operator: '=', value: session_id }],
        limit: 1,
      })
      orderId = (matches[0]?.id as string | undefined) ?? null
    }
    if (!orderId) {
      res.status(404).json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
      return
    }
    const existing = await findById<Record<string, unknown>>('orders', orderId)
    if (!existing) {
      res.status(404).json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
      return
    }
    if (existing.user_id !== userId) {
      res.status(403).json({ error: t('auth.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const fulfilled = await fulfillOrder(orderId)
    res.json({ ...fulfilled.order, tickets: fulfilled.tickets })
  } catch (err) {
    logger.error('orders simulate failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/refund', validateParams(idParamSchema), async (req: Request, res: Response) => {
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
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    const event = await findById<Record<string, unknown>>('events', String(order.event_id))
    const isOrganizer = event && (event.organizer_user_id === userId || event.user_id === userId)
    if (!isOrganizer) {
      return res
        .status(403)
        .json({ error: t('order.refundForbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    // Idempotent: a re-refund is a no-op, so quantity_sold is never decremented twice.
    if (order.status === 'refunded') {
      return res.json(order)
    }
    // Reverse the fulfillment. Only a PAID order ever claimed tier capacity (fulfillOrder
    // increments quantity_sold) or issued live tickets — so only then do we give the seats
    // back and void the tickets. Skipping this left refunded seats permanently stranded as
    // sold-out, and left refunded tickets valid for entry (checkin.ts already rejects
    // ticket.status === 'refunded', but nothing ever set it — a dead guard until now).
    if (order.status === 'paid') {
      const tierId = order.tier_id != null ? String(order.tier_id) : null
      const eventId = order.event_id != null ? String(order.event_id) : null
      const quantity = Number(order.quantity ?? 1)
      if (tierId) {
        // Clamp at 0 so a manual over-refund can't drive quantity_sold negative.
        await query(
          `UPDATE ticket_tiers SET quantity_sold = GREATEST(quantity_sold - $1, 0) WHERE id = $2`,
          [quantity, tierId],
        )
      }
      if (eventId) {
        // Mirror the tier give-back at the event level so the sold-out indicator frees the seats.
        await query(
          `UPDATE events SET tickets_sold = GREATEST(tickets_sold - $1, 0) WHERE id = $2`,
          [quantity, eventId],
        )
      }
      await query(`UPDATE tickets SET status = 'refunded' WHERE order_id = $1`, [id])
    }
    const result = await updateById('orders', id, {
      status: 'refunded',
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('orders PUT :id/refund failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
