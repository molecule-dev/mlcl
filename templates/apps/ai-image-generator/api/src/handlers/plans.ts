/**
 * Plans handler — exposes the plan catalogue + the authed user's active
 * plan. Switching to a paid plan creates a real Stripe Checkout session
 * (using inline `price_data` so no pre-provisioned Stripe Price is
 * required) and returns its URL — the frontend redirects the user there
 * to actually pay. Switching to the free `starter` plan is a direct DB
 * update (no payment needed).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { getClient as getStripe } from '@molecule/api-payments-stripe'

const router = Router()

const switchSchema = z.object({ planKey: z.string().min(1).max(120) })

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/mo',
    creditsPerMonth: 120,
    blurb: '120 credits to play, ideal for sketchpad ideation.',
    features: ['120 credits / month', 'Reverie Flash drafts', 'Public gallery', 'Community styles'],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: '$24',
    period: '/mo',
    creditsPerMonth: 4_000,
    blurb: 'For working artists shipping client work weekly.',
    features: [
      '4,000 credits / month',
      'Reverie XL v3 + Print',
      'Private collections',
      'Upscale 4× included',
      'Priority queue',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$96',
    period: '/mo',
    creditsPerMonth: 20_000,
    blurb: 'Shared library, brand styles and dedicated throughput.',
    features: [
      '20,000 credits / seat',
      'Team collections',
      'Custom style fine-tunes',
      'API access',
      'SLA support',
    ],
  },
] as const

interface UserRow {
  id: string
  planKey: string | null
}

const CONFIRMABLE_STATUSES = new Set(['paid', 'no_payment_required'])

const confirmSchema = z.object({ sessionId: z.string().min(1) })

/**
 * Apply a successful Stripe checkout to the database: flip the user's
 * planKey AND credit-grant the new plan's monthly allowance. Idempotent:
 * if a credit_ledger row already exists for this stripe_session_id, do
 * not double-grant. Both `confirm-checkout` (called from the success
 * page) and the webhook handler funnel through this so the same
 * invariants hold regardless of which path arrives first.
 */
async function applyCheckoutSuccess(
  userId: string,
  planKey: string,
  sessionId: string,
): Promise<void> {
  const plan = PLANS.find((p) => p.id === planKey)
  if (!plan) {
    throw new Error(`unknown plan ${planKey}`)
  }
  await updateById('users', userId, {
    planKey,
    updatedAt: new Date(),
  })
  const referenceId = `stripe:${sessionId}`
  const existing = await findMany<{ id: string }>('credit_ledger', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'reference_id', operator: '=', value: referenceId },
    ],
    limit: 1,
  })
  if (existing.length > 0) return
  await create('credit_ledger', {
    user_id: userId,
    delta: plan.creditsPerMonth,
    reason: 'plan_grant',
    reference_id: referenceId,
  })
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const user = await findById<UserRow>('users', userId)
    const activeKey = user?.planKey ?? 'starter'
    res.json(
      PLANS.map((p) => ({
        ...p,
        current: p.id === activeKey,
      })),
    )
  } catch (error) {
    logger.error('plans.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Cents-per-month pricing used as Stripe inline `unit_amount`. Keep in
// sync with the human-readable `price` on each PLAN entry above.
const PLAN_PRICES_CENTS: Record<string, number> = {
  creator: 2400,
  studio: 9600,
}

router.post('/switch', validateBody(switchSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof switchSchema>
    const plan = PLANS.find((p) => p.id === body.planKey)
    if (!plan) {
      return res.status(404).json({
        error: t('plans.notFound', {}, { defaultValue: 'Plan not found' }),
      })
    }

    // Free / Starter plan — direct downgrade, no payment.
    if (body.planKey === 'starter') {
      await updateById('users', userId, {
        planKey: body.planKey,
        updatedAt: new Date(),
      })
      return res.json({ planKey: body.planKey })
    }

    // Paid plan — create a real Stripe Checkout session. Refusing to
    // upgrade a user without a real payment is the entire point — silent
    // DB-only "upgrades" let users use paid features for free.
    const unitAmount = PLAN_PRICES_CENTS[body.planKey]
    if (!unitAmount) {
      return res.status(400).json({
        error: t('plans.unpriced', {}, { defaultValue: 'Plan has no configured price' }),
      })
    }

    const origin =
      (req.headers['origin'] as string | undefined) ??
      `${req.protocol}://${req.get('host') ?? 'localhost:3000'}`
    const successUrl = `${origin}/plan-updated?planKey=${encodeURIComponent(body.planKey)}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/settings?upgrade=cancelled`

    const stripe = getStripe()
    // Derive the param type from the bond-provided client rather than importing
    // stripe's types directly — the annotation and the call then share ONE module
    // identity, immune to npm placing a second physical stripe copy in the tree.
    const sessionParams: NonNullable<Parameters<typeof stripe.checkout.sessions.create>[0]> = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            recurring: { interval: 'month' },
            product_data: {
              name: `Reverie ${plan.name}`,
              description: plan.blurb,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planKey: body.planKey },
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    res.json({ planKey: body.planKey, checkoutUrl: session.url, sessionId: session.id })
  } catch (err) {
    console.error('[plans/switch] failed:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Frontend-driven confirmation: the success_url page redirects with
 * `?session_id=...`; the page POSTs that here so we can flip the plan
 * the moment the user lands. This keeps the upgrade working in dev
 * (where no public webhook URL exists) and gives a snappy UX in
 * production. The webhook handler below is the production safety net
 * for users who close the browser before the redirect lands.
 */
router.post(
  '/confirm-checkout',
  validateBody(confirmSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
      }
      const { sessionId } = req.body as z.infer<typeof confirmSchema>
      const stripe = getStripe()
      let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId)
      } catch (err) {
        // Unknown/malformed session id (Stripe raises `resource_missing` and
        // similar): a client-input problem, NOT a server fault. Answer 402 so
        // the caller sees "not confirmable" instead of an opaque 500 — the
        // invariant this endpoint protects is that an unverifiable session is
        // never confirmed.
        console.error('[plans/confirm-checkout] session retrieve failed:', err)
        return res.status(402).json({
          error: t('plans.confirmUnpaid', {}, { defaultValue: 'Checkout session is not yet paid' }),
          paymentStatus: null,
        })
      }
      const sessionUserId = (session.metadata?.userId as string | undefined) ?? null
      const planKey = (session.metadata?.planKey as string | undefined) ?? null
      if (!sessionUserId || sessionUserId !== userId) {
        return res.status(403).json({
          error: t(
            'plans.confirmForbidden',
            {},
            { defaultValue: 'Checkout session does not belong to this account' },
          ),
        })
      }
      if (!planKey) {
        return res.status(400).json({
          error: t(
            'plans.confirmMissingPlan',
            {},
            { defaultValue: 'Checkout session is missing plan metadata' },
          ),
        })
      }
      const status = (session.payment_status as string | null) ?? null
      if (!status || !CONFIRMABLE_STATUSES.has(status)) {
        return res.status(402).json({
          error: t('plans.confirmUnpaid', {}, { defaultValue: 'Checkout session is not yet paid' }),
          paymentStatus: status,
        })
      }
      await applyCheckoutSuccess(userId, planKey, sessionId)
      res.json({ planKey, confirmed: true })
    } catch (err) {
      console.error('[plans/confirm-checkout] failed:', err)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
