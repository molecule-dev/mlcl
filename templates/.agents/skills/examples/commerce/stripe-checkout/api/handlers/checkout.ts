/**
 * Checkout handler — creates Stripe Checkout sessions.
 *
 * The frontend POSTs `{ priceId }` to /checkout/session, gets back a
 * Stripe-hosted checkout URL, and redirects the browser to it. Stripe
 * handles the card form, 3DS, etc. We never see the card.
 */
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
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
        metadata.orderId = body.orderId
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
      // Log the real failure — a swallowed 500 here (bad key, wrong price id)
      // is undebuggable from the frontend's generic message alone.
      logger.error('checkout session create failed', { error: err })
      res.status(500).json({ error: 'Failed to create checkout session' })
    }
  },
)

export default router
