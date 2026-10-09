/**
 * Checkout handler — creates Stripe Checkout sessions.
 *
 * The frontend POSTs `{ priceId }` to /checkout/session, gets back a
 * Stripe-hosted checkout URL, and redirects the browser to it. Stripe
 * handles the card form, 3DS, etc. We never see the card.
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { validateBody } from '@molecule/api-middleware-validation'
import { createCheckoutSession } from '@molecule/api-payments-stripe'

const router = Router()

const sessionSchema = z.object({
  priceId: z.string().min(1),
  // Optional metadata for the resulting webhook to associate with a user/order.
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

router.post('/session', validateBody(sessionSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as z.infer<typeof sessionSchema>

    const session = await createCheckoutSession({
      priceId: body.priceId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    })

    res.json({ url: session.url, id: session.id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

export default router
