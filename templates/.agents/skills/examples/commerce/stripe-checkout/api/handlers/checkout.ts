/**
 * Checkout handler — creates Stripe Checkout sessions.
 *
 * The frontend POSTs `{ priceId }` to /checkout/session, gets back a
 * Stripe-hosted checkout URL, and redirects the browser to it. Stripe
 * handles the card form, 3DS, etc. We never see the card.
 */
import { getLogger } from '@molecule/api-bond'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { validateBody } from '@molecule/api-middleware-validation'
import { createCheckoutSession } from '@molecule/api-payments-stripe'

const logger = getLogger()

const router = Router()

const sessionSchema = z.object({
  priceId: z.string().min(1),
  // Optional webhook-association metadata. webhooks.ts marks the buyer's
  // `orders` row paid by `session.metadata.orderId` — an order-id POSTed here
  // is what makes that connection actually fire. customerEmail rides along in
  // the same metadata for receipt/lookup flows.
  orderId: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

router.post('/session', validateBody(sessionSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as z.infer<typeof sessionSchema>

    // Stripe metadata values must be strings; pass the object only when there
    // is something to associate, so a bare price-checkout ships no metadata.
    const metadata: Record<string, string> = {}
    if (body.orderId) metadata.orderId = body.orderId
    if (body.customerEmail) metadata.customerEmail = body.customerEmail

    const session = await createCheckoutSession({
      priceId: body.priceId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    })

    res.json({ url: session.url, id: session.id })
  } catch (err) {
    // Log the real failure — a swallowed 500 here (bad key, wrong price id)
    // is undebuggable from the frontend's generic message alone.
    logger.error('checkout session create failed', { error: err })
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

export default router
