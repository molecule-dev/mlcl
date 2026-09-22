/**
 * Checkout handler — `/api/checkout/*`. One-time Stripe Checkout
 * sessions for buying a single digital product, plus the webhook that
 * creates the buyer's purchase + license + emails the receipt.
 *
 * Subscription billing (Pro / Team plans) lives in routes/billing.ts.
 *
 * Why not use the molecule package's `createCheckoutSession`? That
 * helper hardcodes `mode: 'subscription'`. Per-product purchases need
 * `mode: 'payment'`. We use `getClient()` directly here; longer-term
 * the molecule package should grow a `createPaymentCheckoutSession`
 * variant that other digital-store flagships can share.
 */
import crypto from 'crypto'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { getClient, verifyWebhookSignature } from '@molecule/api-payments-stripe'

const router = Router()

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return 0
  return Number(v)
}

function generateLicenseKey(): string {
  const prefix = process.env.LICENSE_KEY_PREFIX ?? 'DG'
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString('hex').toUpperCase(),
  )
  return `${prefix}-${segments.join('-')}`
}

const createSessionSchema = z
  .object({
    productId: z.string().min(1).optional(),
    productSlug: z.string().min(1).optional(),
    // NOTE: there is deliberately no client-supplied price field here. The amount
    // charged is always the server-side listed price (see `finalAmountCents`
    // below) so a buyer can never tamper with / underpay the price. If genuine
    // pay-what-you-want is ever wanted, gate it behind a per-product
    // `pwyw_enabled` column and clamp any override to >= the listed/min price.
  })
  .refine((v) => v.productId != null || v.productSlug != null, {
    message: 'productId or productSlug required',
  })

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findProduct(idOrSlug: string): Promise<Record<string, unknown> | null> {
  if (UUID_RX.test(idOrSlug)) {
    return (await findById<Record<string, unknown>>('products', idOrSlug)) ?? null
  }
  const matches = await findMany<Record<string, unknown>>('products', {
    where: [{ field: 'slug', operator: '=', value: idOrSlug }],
    limit: 1,
  })
  return matches[0] ?? null
}

/** Idempotently fulfill a checkout session: create the purchase + license
 *  rows, increment product stats, and email the receipt. Safe to call
 *  twice (duplicate webhook delivery is normal in Stripe). */
async function fulfillSession(args: {
  userId: string
  productId: string
  amountCents: number
  paymentId: string
  paymentReceiptUrl?: string | null
}): Promise<{ purchaseId: string; licenseKey: string }> {
  // Idempotency: if we've already recorded this paymentId, just return the
  // existing purchase. Stripe sometimes redelivers the event on retry.
  const existing = await findMany<Record<string, unknown>>('purchases', {
    where: [{ field: 'payment_id', operator: '=', value: args.paymentId }],
    limit: 1,
  })
  if (existing.length > 0) {
    const purchase = existing[0]!
    const licenses = await findMany<Record<string, unknown>>('licenses', {
      where: [{ field: 'purchase_id', operator: '=', value: purchase.id }],
      limit: 1,
    })
    return {
      purchaseId: purchase.id as string,
      licenseKey: (licenses[0]?.license_key as string) ?? '',
    }
  }
  const product = await findById<Record<string, unknown>>('products', args.productId)
  if (!product) {
    throw new Error(`Product ${args.productId} not found at fulfillment time`)
  }

  const purchaseResult = await create<Record<string, unknown>>('purchases', {
    user_id: args.userId,
    product_id: args.productId,
    amount: args.amountCents,
    currency: product.currency ?? 'USD',
    status: 'completed',
    payment_id: args.paymentId,
  })
  const purchase = purchaseResult.data as Record<string, unknown>

  const licenseKey = generateLicenseKey()
  await create('licenses', {
    purchase_id: purchase.id,
    product_id: args.productId,
    user_id: args.userId,
    license_key: licenseKey,
    status: 'active',
    activations: 0,
    max_activations: 3,
  })

  // Bump product stats. Best-effort.
  try {
    await updateById('products', args.productId, {
      total_sales: toNum(product.total_sales) + 1,
      total_revenue: toNum(product.total_revenue) + args.amountCents,
    })
  } catch (err) {
    logger.error('Failed to update product stats after purchase', err)
  }

  // Receipt email (best-effort — Mailgun outage shouldn't block the sale).
  try {
    const buyer = await findById<Record<string, unknown>>('users', args.userId)
    const email = buyer?.email as string | undefined
    if (email) {
      const { sendMail } = await import('@molecule/api-emails')
      const fromEmail =
        process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`
      await sendMail({
        from: fromEmail,
        to: email,
        subject: `Your purchase: ${product.name as string}`,
        text:
          `Thanks for your purchase!\n\n` +
          `Product: ${product.name as string}\n` +
          `License key: ${licenseKey}\n` +
          (args.paymentReceiptUrl ? `Receipt: ${args.paymentReceiptUrl}\n` : '') +
          `\nDownload from your library at any time.`,
      })
    }
  } catch (err) {
    logger.error('Failed to send purchase receipt email', err)
  }

  return { purchaseId: purchase.id as string, licenseKey }
}

router.post(
  '/create-session',
  validateBody(createSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const { productId, productSlug } = req.body as z.infer<typeof createSessionSchema>
      const product = await findProduct(productId ?? productSlug!)
      if (!product || product.status !== 'active') {
        res
          .status(404)
          .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
        return
      }
      const owned = await findMany<Record<string, unknown>>('purchases', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'product_id', operator: '=', value: product.id },
          { field: 'status', operator: '=', value: 'completed' },
        ],
        limit: 1,
      })
      if (owned.length > 0) {
        res.status(409).json({
          error: t('purchase.alreadyOwned', undefined, {
            defaultValue: 'You already own this product',
          }),
          purchaseId: owned[0]!.id,
        })
        return
      }
      const productPriceCents = toNum(product.price)
      // Free product? Skip Stripe entirely; fulfill directly and return a
      // sentinel URL the client uses to know it can navigate to /order/:id.
      if (productPriceCents === 0) {
        const fulfilled = await fulfillSession({
          userId,
          productId: product.id as string,
          amountCents: 0,
          paymentId: `free_${crypto.randomUUID()}`,
        })
        res.json({
          orderId: fulfilled.purchaseId,
          freeOrder: true,
          licenseKey: fulfilled.licenseKey,
        })
        return
      }
      // Always charge the server-side listed price. The client cannot supply or
      // override the amount, so `unit_amount` below can never be tampered with.
      const finalAmountCents = productPriceCents

      const origin =
        (req.headers.origin as string | undefined) ??
        `${req.protocol}://${req.get('host') ?? 'localhost'}`

      const session = await getClient().checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: ((product.currency as string) ?? 'USD').toLowerCase(),
              unit_amount: finalAmountCents,
              product_data: {
                name: product.name as string,
                ...(product.description ? { description: product.description as string } : {}),
                ...(product.cover_image ? { images: [product.cover_image as string] } : {}),
              },
            },
          },
        ],
        success_url: `${origin}/order/{CHECKOUT_SESSION_ID}/confirm`,
        cancel_url: `${origin}/shop/${product.slug as string}?canceled=1`,
        metadata: {
          userId,
          productId: product.id as string,
        },
      })

      res.json({
        sessionId: session.id,
        url: session.url,
      })
    } catch (err) {
      logger.error('checkout/create-session failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Stripe webhook receiver. Uses `req.rawBody` (set by the global body-parser
 * middleware via its `verify` callback) so signature verification sees the
 * unparsed bytes even though Express has already JSON-parsed `req.body`. Do NOT
 * add a route-level `express.raw()` — the global JSON parser already consumed the
 * body, so `req.body` here is the PARSED object, not a Buffer.
 *
 * Handles `checkout.session.completed` (one-time product checkouts) AND
 * `customer.subscription.created/updated/deleted` (Pro/Team plans).
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
      const metadata = (session.metadata as Record<string, string> | undefined) ?? {}
      const userId = metadata.userId
      const productId = metadata.productId
      const paymentId = (session.payment_intent as string | null) ?? (session.id as string)
      const amountTotal = toNum(session.amount_total)
      if (userId && productId) {
        await fulfillSession({
          userId,
          productId,
          amountCents: amountTotal,
          paymentId,
        })
      } else {
        logger.error('checkout.session.completed missing metadata', { session })
      }
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      // Subscription events — let the user-payments resource module own these.
      // We log so they're visible in /tmp/dev-*.log; the resource module's own
      // webhook hook (registered via `handlePaymentNotification`) is where the
      // canonical update happens.
      logger.info(`Subscription event ${event.type} delivered to checkout webhook (no-op)`)
    }
  } catch (err) {
    logger.error('webhook fulfillment failed', err)
    res.status(500).json({ error: 'Webhook processing failed' })
    return
  }
  res.json({ received: true })
})

/**
 * Test-only endpoint: simulate a successful checkout for the given
 * sessionId. Used by E2E to bypass the Stripe-hosted card form when
 * we just need to verify backend fulfillment + downstream UI.
 *
 * Disabled in production. The real production path is the webhook above.
 */
const simulateSchema = z.object({
  sessionId: z.string().min(1),
})
router.post('/simulate', validateBody(simulateSchema), async (req: Request, res: Response) => {
  // Fail CLOSED: this test seam fulfills a purchase with NO payment verification, so
  // it must be off by default. Gating on NODE_ENV was fail-OPEN (scaffold ships
  // NODE_ENV=development → live payment bypass out of the box). [P5TPL-1/RVALL]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const { sessionId } = req.body as z.infer<typeof simulateSchema>
    const session = await getClient().checkout.sessions.retrieve(sessionId)
    const metadata = (session.metadata as Record<string, string> | null) ?? {}
    const userId = metadata.userId
    const productId = metadata.productId
    if (!userId || !productId) {
      res.status(400).json({ error: 'Session missing metadata.userId/productId' })
      return
    }
    const paymentId = (session.payment_intent as string | null) ?? session.id
    const fulfilled = await fulfillSession({
      userId,
      productId,
      amountCents: session.amount_total ?? 0,
      paymentId,
    })
    res.json({ ...fulfilled, sessionId })
  } catch (err) {
    logger.error('checkout/simulate failed', err)
    res.status(500).json({
      error: 'Simulate failed',
    })
  }
})

/**
 * GET /api/checkout/session/:sessionId — fetch a session by id and
 * return the linked purchase if fulfillment has happened. The
 * OrderConfirm page uses this to load the polished receipt after
 * Stripe redirects back with `{CHECKOUT_SESSION_ID}` substituted.
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const sessionId = req.params.sessionId as string
    const session = await getClient().checkout.sessions.retrieve(sessionId)
    if (session.metadata?.userId !== userId) {
      res.status(403).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const paymentId = (session.payment_intent as string | null) ?? session.id
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [{ field: 'payment_id', operator: '=', value: paymentId }],
      limit: 1,
    })
    res.json({
      sessionId,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      purchaseId: purchases[0]?.id ?? null,
      productId: session.metadata?.productId ?? null,
    })
  } catch (err) {
    logger.error('checkout.getSession', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
