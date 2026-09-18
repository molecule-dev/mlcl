/**
 * Won-auction checkout endpoint — for the user that won an auction.
 *
 *   GET  /api/checkout/:id          → calculated checkout summary (item, fees,
 *                                     shipping options, current order status)
 *   POST /api/checkout/:id/pay      → create a Stripe Checkout session that the
 *                                     user pays through; returns checkoutUrl.
 *                                     A `pending_payment` won_orders row is
 *                                     ensured before the session is created.
 *   POST /api/checkout/:id/simulate → test-only: mark won_orders as paid and
 *                                     return the new state. Disabled in
 *                                     production. The real production path is
 *                                     the Stripe webhook.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { getClient, verifyWebhookSignature } from '@molecule/api-payments-stripe'

const router = Router()

interface ListingRow {
  id: string
  title: string
  category: string
  seller_id: string
  current_price: number
  end_time: string
  status: string
  highest_bidder_id?: string | null
}

interface UserRow {
  id: string
  username: string | null
  name: string | null
  email: string | null
}

interface WonOrderRow {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount: number
  status: string
  payment_id?: string | null
  shipping_address?: unknown
}

const SHIPPING_OPTIONS = [
  { id: 'so-ground', label: 'Insured ground', cents: 4500, eta: '5–7 business days' },
  { id: 'so-express', label: 'Insured express', cents: 12500, eta: '2 business days' },
  { id: 'so-glove', label: 'White-glove delivery', cents: 28000, eta: 'Personally delivered' },
] as const

function calcFees(finalCents: number): { platform: number; tax: number } {
  return {
    // No buyer's premium — Terms/Help/About promise "what you bid is what
    // you owe". Platform revenue is the seller-side final value fee. The
    // field stays in the payload (and the UI hides it at 0) so a premium
    // can be reintroduced without a contract change.
    platform: 0,
    tax: Math.round(finalCents * 0.08),
  }
}

async function ensureWonOrder(listing: ListingRow, userId: string): Promise<WonOrderRow> {
  const existing = await findMany<WonOrderRow>('won_orders', {
    where: [
      { field: 'listing_id', operator: '=', value: listing.id },
      { field: 'buyer_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  if (existing[0]) return existing[0]
  const result = await create<WonOrderRow>('won_orders', {
    listing_id: listing.id,
    buyer_id: userId,
    seller_id: listing.seller_id,
    amount: Number(listing.current_price ?? 0),
    status: 'pending_payment',
  })
  return result.data as WonOrderRow
}

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = req.params.id
  const listingId = Array.isArray(id) ? id[0] : id
  const listing = await findById<ListingRow>('listings', listingId)
  if (!listing) {
    res
      .status(404)
      .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    return
  }
  // Only the winner of a genuinely SOLD listing may check out. `status` must be `sold` — an auction
  // that ended below reserve (`reserve_not_met`) or with no bids (`cancelled`) is NOT a sale, so it
  // must not be checkout-able even though its highest_bidder_id is still set. Gating on `!== active`
  // let a below-reserve top bidder mint a won order and pay, defeating the reserve.
  if (
    listing.status !== 'sold' ||
    !listing.highest_bidder_id ||
    listing.highest_bidder_id !== userId
  ) {
    res.status(403).json({
      error: t('checkout.notWinner', {}, { defaultValue: 'You did not win this auction' }),
    })
    return
  }
  const seller = await findById<UserRow>('users', listing.seller_id)
  const order = await ensureWonOrder(listing, userId)
  const finalCents = Number(listing.current_price ?? 0)
  const fees = calcFees(finalCents)
  res.json({
    auction_id: listing.id,
    title: listing.title,
    category: listing.category,
    lot: `Lot #${String(listing.id).slice(0, 4).toUpperCase()}`,
    final_price_cents: finalCents,
    seller_name: seller?.name ?? seller?.username ?? 'Seller',
    seller_handle: seller?.username ?? listing.seller_id,
    // 72h payment window — must match the Terms "Bids are binding" section.
    pay_by: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    shipping_options: SHIPPING_OPTIONS,
    payment_options: [],
    shipping_addresses: [
      {
        id: 'addr-stripe',
        label: 'Enter at checkout',
        lines: ['Stripe will collect your shipping address', 'on the next page before charging.'],
        primary: true,
      },
    ],
    fee_cents: fees,
    order_id: order.id,
    order_status: order.status,
  })
})

const paySchema = z.object({
  shipping: z.string().optional(),
  payment: z.string().optional(),
  address: z.string().optional(),
})

router.post('/:id/pay', validateBody(paySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = req.params.id
  const listingId = Array.isArray(id) ? id[0] : id
  const listing = await findById<ListingRow>('listings', listingId)
  if (!listing) {
    res
      .status(404)
      .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    return
  }
  if (
    listing.status !== 'sold' ||
    !listing.highest_bidder_id ||
    listing.highest_bidder_id !== userId
  ) {
    res.status(403).json({
      error: t('checkout.notWinner', {}, { defaultValue: 'You did not win this auction' }),
    })
    return
  }
  const buyer = await findById<UserRow>('users', userId)
  const order = await ensureWonOrder(listing, userId)
  if (order.status === 'paid') {
    res.json({ orderId: order.id, status: 'paid', alreadyPaid: true })
    return
  }
  const body = req.body as z.infer<typeof paySchema>
  const shippingOption = SHIPPING_OPTIONS.find((o) => o.id === body.shipping) ?? SHIPPING_OPTIONS[0]
  const finalCents = Number(listing.current_price ?? 0)
  const fees = calcFees(finalCents)
  const totalCents = finalCents + fees.platform + fees.tax + shippingOption.cents

  const origin =
    (req.headers.origin as string | undefined) ??
    `${req.protocol}://${req.get('host') ?? 'localhost'}`

  try {
    const session = await getClient().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(buyer?.email ? { customer_email: buyer.email } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: totalCents,
            product_data: {
              name: `Won lot: ${listing.title}`,
              description: `Hammer price ${(finalCents / 100).toFixed(2)} + tax + shipping (${shippingOption.label})`,
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          'US',
          'CA',
          'GB',
          'AU',
          'NZ',
          'IE',
          'DE',
          'FR',
          'IT',
          'ES',
          'NL',
          'BE',
          'AT',
          'SE',
          'NO',
          'DK',
          'FI',
          'CH',
          'PT',
          'JP',
          'SG',
          'HK',
          'KR',
        ],
      },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/my-bids?paid=${listing.id}`,
      cancel_url: `${origin}/my-bids/won/${listing.id}/checkout?canceled=1`,
      metadata: {
        userId,
        listingId: listing.id,
        wonOrderId: order.id,
        shippingOptionId: shippingOption.id,
      },
    })
    await updateById('won_orders', order.id, {
      payment_id: session.id,
      shipping_address: JSON.stringify({
        shipping_option_id: shippingOption.id,
        shipping_cents: shippingOption.cents,
      }),
    })
    res.json({
      orderId: order.id,
      status: order.status,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount_total: totalCents,
    })
  } catch (err) {
    logger.error('checkout/:id/pay failed', err)
    res.status(502).json({
      error: t('checkout.payFailed', {}, { defaultValue: 'Could not start checkout' }),
      detail: err instanceof Error ? err.message : undefined,
    })
  }
})

/**
 * Stripe webhook receiver for won-checkout sessions. Uses `req.rawBody`
 * (set by the body-parser middleware via the `verify` callback) so
 * signature verification sees the unparsed body even though Express
 * has already JSON-parsed it. Handles `checkout.session.completed` for
 * the one-time payment flow created by POST /checkout/:id/pay above
 * and marks the matching `won_orders` row as `paid` so the next read
 * reflects the Stripe-side truth.
 *
 * Mounted at /api/checkout/webhook. Configure your Stripe dashboard to
 * deliver webhooks here using STRIPE_WEBHOOK_SECRET.
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
  if (event.type !== 'checkout.session.completed') {
    res.json({ received: true, ignored: event.type })
    return
  }
  try {
    const session = event.data.object as Record<string, unknown>
    const metadata = (session.metadata as Record<string, string> | undefined) ?? {}
    const wonOrderId = metadata.wonOrderId
    if (!wonOrderId) {
      logger.error('checkout.session.completed missing wonOrderId metadata', { session })
      res.status(400).json({ error: 'Missing metadata.wonOrderId' })
      return
    }
    const order = await findById<WonOrderRow>('won_orders', wonOrderId)
    if (!order) {
      logger.error('won_order not found for webhook', { wonOrderId })
      res.status(404).json({ error: 'Won order not found' })
      return
    }
    if (order.status === 'paid') {
      res.json({ received: true, alreadyPaid: true, wonOrderId })
      return
    }
    const collectedShipping =
      (session.shipping_details as Record<string, unknown> | undefined) ??
      (session.customer_details as
        { address?: Record<string, unknown>; name?: string; phone?: string } | undefined)
    const existingShipping = (() => {
      const raw = order.shipping_address as unknown
      if (!raw) return {}
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Record<string, unknown>
        } catch (_error) {
          // safe to ignore: malformed JSON falls back to empty shipping object
          return {}
        }
      }
      if (typeof raw === 'object') return raw as Record<string, unknown>
      return {}
    })()
    const mergedShipping = {
      ...existingShipping,
      stripe_session_id: session.id ?? null,
      collected: collectedShipping ?? null,
    }
    await updateById('won_orders', wonOrderId, {
      status: 'paid',
      payment_id: order.payment_id ?? String(session.id ?? `wh_${wonOrderId}`),
      shipping_address: JSON.stringify(mergedShipping),
    })
    res.json({ received: true, wonOrderId })
  } catch (err) {
    logger.error('checkout webhook fulfillment failed', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

/**
 * Test-only: mark a won_orders row as paid, simulating a Stripe webhook.
 * Used by E2E to verify post-payment state without driving the
 * Stripe-hosted checkout form.
 */
router.post('/:id/simulate', async (req: Request, res: Response) => {
  // Fail CLOSED: this test seam marks the won order paid with NO payment
  // verification, so it must be off by default. Gating on NODE_ENV was fail-OPEN
  // (scaffold ships NODE_ENV=development → live payment bypass). [P5TPL-1/RVALL]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = req.params.id
  const listingId = Array.isArray(id) ? id[0] : id
  const listing = await findById<ListingRow>('listings', listingId)
  if (!listing) {
    res
      .status(404)
      .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    return
  }
  // Same reserve gate as the real checkout: only a genuinely sold listing's winner may be settled.
  if (listing.status !== 'sold' || listing.highest_bidder_id !== userId) {
    res.status(403).json({
      error: t('checkout.notWinner', {}, { defaultValue: 'You did not win this auction' }),
    })
    return
  }
  const order = await ensureWonOrder(listing, userId)
  await updateById('won_orders', order.id, {
    status: 'paid',
    payment_id: order.payment_id ?? `sim_${order.id}`,
  })
  res.json({ orderId: order.id, status: 'paid' })
})

export default router
