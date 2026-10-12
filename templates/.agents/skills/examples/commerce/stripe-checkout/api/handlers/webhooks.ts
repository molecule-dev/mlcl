/**
 * Stripe webhooks — verify signature + dispatch on event type.
 *
 * Stripe sends events when payments succeed, subscriptions update, etc.
 * The provider's `verifyWebhookSignature` function HMAC-validates the signature
 * using STRIPE_WEBHOOK_SECRET. NEVER skip verification — without it,
 * an attacker can fake "payment succeeded" by POSTing JSON.
 *
 * Stripe signs the RAW bytes of the body, so verification must see the unparsed
 * body. In a molecule app the generated server's global body-parser already
 * captures it: its express.json({ verify }) saves the raw body to `req.rawBody`
 * (a string) on every request. Read THAT — do NOT add a route-specific
 * `express.raw(...)` middleware: by the time the request reaches this router the
 * global parser has already consumed the stream, so a route-level parser cannot
 * recover the raw bytes, and req.body here is the PARSED object — passing it to
 * verifyWebhookSignature fails the HMAC every time. On a server generated before
 * that verify callback existed, re-run `mlcl inject` or add the callback to the
 * express.json call in src/server.ts — until then every delivery 400s below.
 */
import type { Request, Response } from 'express'
import { Router } from 'express'

import { getLogger } from '@molecule/api-bond'
import { updateById, updateMany } from '@molecule/api-database'
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
      const session = event.data.object as {
        id: string
        metadata?: { orderId?: string; checkoutAttempt?: string }
      }
      if (session.metadata?.orderId) {
        // Stripe delivers events AT-LEAST-ONCE (it retries), so this can fire
        // twice for one payment. Setting status to a fixed value is idempotent, so
        // a re-delivery is a harmless no-op. If you change this to a NON-idempotent
        // action (credit a balance, ship, grant access, email a receipt), dedupe on
        // `session.id` first — verifyWebhookSignature's result exposes only
        // { type, data }, so the Stripe event id is not available to dedupe on —
        // else a retry double-fulfills.
        //
        // A row the update does NOT reach is not the same no-op: `updateById`
        // answers `affected: 0` for a missing row without throwing, and this
        // handler answered `received: true` for it — an ACK. Stripe's recovery
        // for a failed delivery is exactly its at-least-once retry (the
        // assumption the idempotency note above stands on), and a retried
        // delivery never comes for an event that was acknowledged: a paid
        // charge whose order row was gone (deleted, or an id from another
        // table) stayed unpaid for good, with nothing anywhere saying why. A
        // missing row is a FAILURE here — answer non-2xx so Stripe keeps
        // retrying, and log the id so the operator can find the charge.
        const updated = await updateById('orders', session.metadata.orderId, { status: 'paid' })
        if (updated.affected === 0) {
          logger.error('stripe webhook: checkout.session.completed names an unknown order', {
            orderId: session.metadata.orderId,
            session: session.id,
          })
          res.status(400).send('Unknown order')
          return
        }
      }
      break
    }
    case 'checkout.session.expired': {
      // RELEASE the checkout claim this session took (see checkout.ts): the
      // claim is what stopped a second concurrent POST from minting another
      // session for the same order, and it is keyed on a nonce only this
      // session knows. The conditional update clears it ONLY while it still
      // holds THIS session's nonce — a claim already replaced (or released) by
      // someone else is left alone. Without the release, an abandoned checkout
      // kept the claim for ever and every later `POST /session` for the order
      // was refused 409.
      const session = event.data.object as {
        id: string
        metadata?: { orderId?: string; checkoutAttempt?: string }
      }
      if (session.metadata?.orderId && session.metadata.checkoutAttempt) {
        await updateMany(
          'orders',
          [
            { field: 'id', operator: '=', value: session.metadata.orderId },
            { field: 'checkout_attempt', operator: '=', value: session.metadata.checkoutAttempt },
          ],
          { checkout_attempt: null },
        )
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
