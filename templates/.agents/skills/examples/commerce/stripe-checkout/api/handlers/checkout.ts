/**
 * Checkout handler — creates Stripe Checkout sessions.
 *
 * The frontend POSTs `{ priceId }` to /checkout/session, gets back a
 * Stripe-hosted checkout URL, and redirects the browser to it. Stripe
 * handles the card form, 3DS, etc. We never see the card.
 *
 * SCHEMA: a checkout for an `orders` row needs ONE new column on that table
 * (it already exists, so the missing-migration verifier will not remind you):
 *
 *   ALTER TABLE orders ADD COLUMN checkout_attempt text;
 *
 * NULL means "no checkout in progress". It is the claim token that keeps two
 * concurrent `POST /session` calls for the same order from minting two live
 * Stripe sessions (see the claim below the ownership checks).
 */
import { randomUUID } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { findById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { createCheckoutSession } from '@molecule/api-payments-stripe'

const logger = getLogger()

const router = Router()

// Same guard the other commerce slices use (billing-portal, downloads): the
// framework's session is the caller's identity, and the order check below
// keys on it.
const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const sessionSchema = z.object({
  priceId: z.string().min(1),
  // Optional webhook-association metadata. webhooks.ts marks the buyer's
  // `orders` row paid by `session.metadata.orderId` — an order-id POSTed here
  // is what makes that connection actually fire, so it is OWNERSHIP-CHECKED
  // below first. customerEmail rides along in the same metadata for
  // receipt/lookup flows.
  orderId: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

router.post(
  '/session',
  requireAuth,
  validateBody(sessionSchema),
  async (req: Request, res: Response) => {
    // The claim this request holds, if it won one: the order id and the nonce,
    // read by the failure path below. NULL means "no claim held" — a bare
    // price checkout never takes one, and a refused claim (409) holds none.
    let heldOrderId: string | null = null
    let heldAttempt: string | null = null
    try {
      const body = req.body as z.infer<typeof sessionSchema>
      const userId = res.locals.session.userId as string

      // Stripe metadata values must be strings; pass the object only when there
      // is something to associate, so a bare price-checkout ships no metadata.
      const metadata: Record<string, string> = {}

      // OWNERSHIP CHECK — the authorization point for the whole flow. The
      // webhook trusts `session.metadata.orderId` and its signature only
      // proves STRIPE sent the event, never that this session was ALLOWED to
      // name that order: an unchecked orderId would let any user mark ANY
      // user's order paid by completing a checkout of any price with the
      // victim's order id in the metadata. Same shape as the other commerce
      // slices' `orders` rows (user_id + status, see downloads.ts).
      if (body.orderId) {
        const order = (await findById('orders', body.orderId)) as {
          id: string
          user_id: string
          status: string
        } | null
        if (!order) {
          return res.status(404).json({
            error: t('orders.notFound', undefined, { defaultValue: 'Order not found' }),
          })
        }
        if (order.user_id !== userId) {
          return res
            .status(403)
            .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
        }
        if (order.status === 'paid') {
          return res.status(409).json({
            error: t('orders.alreadyPaid', undefined, { defaultValue: 'Order is already paid' }),
          })
        }
        // THE CLAIM. The `paid` check above is a read-then-act: between it and
        // `createCheckoutSession` below sits a network call (seconds), and two
        // concurrent POSTs for the same unpaid order both sailed past it —
        // minting two live Stripe sessions for one order, and a customer who
        // completes both is charged twice for one order (the webhook sets
        // `paid` either way). So the session is minted only by the caller that
        // wins ONE atomic compare-and-set, judged by the database, not by this
        // read: the WHERE carries "claim column still NULL and not paid", and
        // `affected: 0` means a concurrent request claimed (or paid) the order
        // in between — refuse instead of minting a second session. The winner
        // stamps its nonce into the session metadata so webhooks.ts can release
        // the claim when the session expires (see that file), which is what
        // keeps an abandoned checkout from blocking the retry for ever.
        const attempt = randomUUID()
        const claimed = await updateMany(
          'orders',
          [
            { field: 'id', operator: '=', value: body.orderId },
            { field: 'checkout_attempt', operator: 'is_null' },
            { field: 'status', operator: '!=', value: 'paid' },
          ],
          { checkout_attempt: attempt },
        )
        if (claimed.affected === 0) {
          return res.status(409).json({
            error: t('orders.checkoutInProgress', undefined, {
              defaultValue:
                'This order already has a checkout in progress — complete it or wait for it to expire.',
            }),
          })
        }
        metadata.orderId = body.orderId
        metadata.checkoutAttempt = attempt
        // Remembered for the catch below: a session mint that FAILS leaves no
        // Stripe session, so no `checkout.session.expired` event can ever
        // release this claim — without a release here the order answered 409
        // "checkout in progress" for ever (every retry refused, no event coming).
        heldOrderId = body.orderId
        heldAttempt = attempt
      }
      if (body.customerEmail) metadata.customerEmail = body.customerEmail

      const session = await createCheckoutSession({
        priceId: body.priceId,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      })

      res.json({ url: session.url, id: session.id })
    } catch (err) {
      // Release the claim this request held — the mint failed, so no Stripe
      // session exists and `checkout.session.expired` can never arrive to
      // release it. Without this, one failed createCheckoutSession (a bad price
      // id, a Stripe outage, any 5xx) left `checkout_attempt` set for ever and
      // every later POST /session for the order was refused 409. The WHERE
      // carries THIS request's nonce (the same conditional shape webhooks.ts'
      // expired-release uses), so a claim already replaced by someone else is
      // left alone; the release is best-effort — its own failure must not
      // replace the mint failure the caller is owed, and the claim it leaves is
      // exactly the state the release exists to clear, logged for the operator.
      if (heldOrderId !== null && heldAttempt !== null) {
        try {
          await updateMany(
            'orders',
            [
              { field: 'id', operator: '=', value: heldOrderId },
              { field: 'checkout_attempt', operator: '=', value: heldAttempt },
            ],
            { checkout_attempt: null },
          )
        } catch (releaseError) {
          logger.warn('checkout claim release after a failed session create failed', {
            orderId: heldOrderId,
            error: releaseError,
          })
        }
      }
      // Log the real failure — a swallowed 500 here (bad key, wrong price id)
      // is undebuggable from the frontend's generic message alone.
      logger.error('checkout session create failed', { error: err })
      res.status(500).json({ error: 'Failed to create checkout session' })
    }
  },
)

export default router
