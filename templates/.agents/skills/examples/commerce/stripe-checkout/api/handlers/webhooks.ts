/**
 * Stripe webhooks — verify signature + dispatch on event type.
 *
 * Stripe sends events when payments succeed, subscriptions update, etc.
 * The provider's `verifyWebhook` function HMAC-validates the signature
 * using STRIPE_WEBHOOK_SECRET. NEVER skip verification — without it,
 * an attacker can fake "payment succeeded" by POSTing JSON.
 *
 * Stripe signs the RAW bytes of the body, so verification must see the unparsed
 * body. In a molecule app the global body-parser already captures it: its
 * express.json({ verify }) saves the raw body to `req.rawBody` (a string) on every
 * request. Read THAT — do NOT add a route-specific `express.raw(...)` middleware
 * (it conflicts with the already-global JSON parser, and req.body here is the
 * PARSED object — passing it to verifyWebhookSignature fails the HMAC every time).
 */
import type { Request, Response } from 'express'
import { Router } from 'express'

import { getLogger } from '@molecule/api-bond'
import { updateById } from '@molecule/api-database'
import { verifyWebhookSignature } from '@molecule/api-payments-stripe'

const logger = getLogger()

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') {
    res.status(400).send('Missing signature')
    return
  }

  // The global body-parser saved the unparsed body here. req.body is the PARSED
  // object — verifying against it would fail the signature check on every request.
  const rawBody = (req as Request & { rawBody?: string }).rawBody
  if (!rawBody) {
    res.status(400).send('Missing raw body for webhook verification')
    return
  }

  let event
  try {
    event = verifyWebhookSignature(Buffer.from(rawBody, 'utf8'), signature)
  } catch (_error) {
    // signature verification failed — reject as 400 (expected for forged / misconfigured senders)
    res.status(400).send('Invalid signature')
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as { id: string; metadata?: { orderId?: string } }
      if (session.metadata?.orderId) {
        // Stripe delivers events AT-LEAST-ONCE (it retries), so this can fire
        // twice for one payment. Setting status to a fixed value is idempotent, so
        // a re-delivery is a harmless no-op. If you change this to a NON-idempotent
        // action (credit a balance, ship, grant access, email a receipt), dedupe on
        // `session.id` first — verifyWebhookSignature's result exposes only
        // { type, data }, so the Stripe event id is not available to dedupe on —
        // else a retry double-fulfills.
        await updateById('orders', session.metadata.orderId, { status: 'paid' })
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // Left to the app: update the matching subscription row here (see
      // the subscription-management slice for the portal flow around it).
      break
    }
    default:
      // Other event types: log + ignore — the log is the only trace a
      // misconfigured webhook endpoint leaves.
      logger.info('stripe webhook ignored', { type: event.type })
      break
  }

  res.json({ received: true })
})

export default router
