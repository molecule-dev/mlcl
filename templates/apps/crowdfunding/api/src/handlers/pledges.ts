import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { CrowdfundingLimits } from '../tiers.js'
import { type CampaignRow, decoratePledge } from './_decorate.js'

const router = Router()

function fail(res: Response, error: unknown, status = 500): void {
  // Log the real error server-side; NEVER return the raw internal error text to the
  // client (CWE-209). [P5TPL-1]
  logger.error('crowdfunding.pledges', error)
  res.status(status).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

interface StripePaymentIntent {
  id: string
  status:
    | 'succeeded'
    | 'requires_action'
    | 'requires_confirmation'
    | 'requires_payment_method'
    | 'canceled'
    | 'processing'
  amount: number
  currency: string
  next_action?: unknown
  client_secret?: string
}

/**
 * Create + confirm a Stripe PaymentIntent in a single round-trip.
 *
 * The frontend supplies a payment method id (`pm_xxx`) — either created
 * client-side via Stripe Elements / Apple/Google Pay, or a Stripe-issued
 * test token like `pm_card_visa` (which auto-succeeds in test mode).
 *
 * Returns the confirmed PaymentIntent. Throws on any non-success terminal
 * state so callers don't accidentally treat a failed charge as completed.
 */
async function chargePledge(params: {
  amount: number
  currency: string
  payment_method: string
  description: string
  metadata: Record<string, string>
}): Promise<StripePaymentIntent> {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  const body = new URLSearchParams()
  body.set('amount', String(Math.round(params.amount * 100)))
  body.set('currency', params.currency)
  body.set('payment_method', params.payment_method)
  body.set('confirm', 'true')
  body.set('description', params.description)
  // Use return_url=off_session so the API doesn't reject for missing
  // redirect URL when the test payment_method requires no 3DS.
  body.set('automatic_payment_methods[enabled]', 'true')
  body.set('automatic_payment_methods[allow_redirects]', 'never')
  for (const [k, v] of Object.entries(params.metadata)) {
    body.set(`metadata[${k}]`, v)
  }
  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = (await res.json()) as StripePaymentIntent & { error?: { message?: string } }
  if (!res.ok) {
    throw new Error(
      `Stripe PaymentIntent failed (${res.status}): ${json.error?.message ?? JSON.stringify(json)}`,
    )
  }
  if (json.status !== 'succeeded') {
    throw new Error(`Pledge charge in non-success state ${json.status}`)
  }
  return json
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const createPledgeSchema = z.object({
  campaign_id: z.string().min(1),
  tier_id: z.string().nullable().optional(),
  amount: z.number().positive(),
  // payment_method must be a Stripe payment method id (pm_xxx).
  // For automated tests we accept Stripe's stable test pm `pm_card_visa`
  // which charges successfully without requiring a browser collection step.
  payment_method: z.string().min(3),
})

router.get(
  '/campaign/:campaignId',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const rawCampaignId = req.params.campaignId
      const campaignId = Array.isArray(rawCampaignId) ? rawCampaignId[0] : rawCampaignId
      // Only the campaign creator can see the full backers list.
      const campaign = await findById<CampaignRow>('campaigns', campaignId)
      if (!campaign) {
        res
          .status(404)
          .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
        return
      }
      if (campaign.creator_id !== userId) {
        res.status(403).json({
          error: t(
            'pledges.notCreator',
            {},
            { defaultValue: 'Only the campaign creator can view its backers' },
          ),
        })
        return
      }
      const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
      const pledges = await findMany<Record<string, unknown>>('pledges', {
        where: [{ field: 'campaign_id', operator: '=', value: campaignId }],
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      const cache = new Map<string, CampaignRow | null>([[campaignId, campaign]])
      const decorated = await Promise.all(
        pledges.map(async (p) => {
          const dec = await decoratePledge(p, cache)
          let backerName = 'Anonymous Backer'
          let backerEmail: string | null = null
          if (p.backer_id) {
            const backer = await findById<Record<string, unknown>>('users', String(p.backer_id))
            if (backer?.name) backerName = String(backer.name)
            else if (backer?.email) backerName = String(backer.email).split('@')[0]
            backerEmail = backer?.email ? String(backer.email) : null
          }
          return {
            ...dec,
            backer_id: String(p.backer_id ?? ''),
            backer_name: backerName,
            backer_email: backerEmail,
          }
        }),
      )
      res.json(decorated)
    } catch (error) {
      fail(res, error)
    }
  },
)

router.get('/my', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const pledges = await findMany<Record<string, unknown>>('pledges', {
      where: [{ field: 'backer_id', operator: '=', value: userId }],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const cache = new Map<string, CampaignRow | null>()
    const decorated = await Promise.all(pledges.map((p) => decoratePledge(p, cache)))
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const pledge = await findById<Record<string, unknown>>('pledges', getParamId(req))
    if (!pledge) {
      res
        .status(404)
        .json({ error: t('pledges.notFound', {}, { defaultValue: 'Pledge not found' }) })
      return
    }
    if (pledge.backer_id !== userId) {
      const campaign = await findById<Record<string, unknown>>(
        'campaigns',
        String(pledge.campaign_id),
      )
      if (!campaign || campaign.creator_id !== userId) {
        res
          .status(404)
          .json({ error: t('pledges.notFound', {}, { defaultValue: 'Pledge not found' }) })
        return
      }
    }
    const decorated = await decoratePledge(pledge)
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.post(
  '/',
  enforceLimit<CrowdfundingLimits>({
    limitType: 'maxPledges',
    getLimit: (limits) => limits.maxPledges,
    getCurrent: async (userId) =>
      count('pledges', [{ field: 'backer_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPledgeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { campaign_id, tier_id, amount, payment_method } = req.body as z.infer<
        typeof createPledgeSchema
      >

      const campaign = await findById<Record<string, unknown>>('campaigns', campaign_id)
      if (!campaign) {
        res
          .status(404)
          .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
        return
      }
      if (campaign.status !== 'active') {
        res.status(400).json({
          error: t(
            'pledges.campaignNotActive',
            {},
            { defaultValue: 'Campaign is not accepting pledges' },
          ),
        })
        return
      }
      if (new Date(String(campaign.end_date)) < new Date()) {
        res
          .status(400)
          .json({ error: t('pledges.campaignEnded', {}, { defaultValue: 'Campaign has ended' }) })
        return
      }

      if (tier_id) {
        const tier = await findById<Record<string, unknown>>('reward_tiers', tier_id)
        if (!tier) {
          res
            .status(404)
            .json({ error: t('tiers.notFound', {}, { defaultValue: 'Reward tier not found' }) })
          return
        }
        if (tier.campaign_id !== campaign_id) {
          res.status(400).json({
            error: t(
              'pledges.tierMismatch',
              {},
              { defaultValue: 'Reward tier does not belong to this campaign' },
            ),
          })
          return
        }
        if (Number(amount) < Number(tier.amount)) {
          res.status(400).json({
            error: t(
              'pledges.belowTierMin',
              { min: String(tier.amount) },
              { defaultValue: 'Pledge amount must be at least {{min}}' },
            ),
          })
          return
        }
        if (
          tier.max_backers !== null &&
          tier.max_backers !== undefined &&
          Number(tier.current_backers) >= Number(tier.max_backers)
        ) {
          res.status(400).json({
            error: t('pledges.tierFull', {}, { defaultValue: 'This reward tier is fully backed' }),
          })
          return
        }
      }

      let charge: StripePaymentIntent
      try {
        charge = await chargePledge({
          amount: Number(amount),
          currency: 'usd',
          payment_method,
          description: t(
            'pledges.chargeDescription',
            { title: String(campaign.title) },
            { defaultValue: `Pledge for ${String(campaign.title)}` },
          ),
          metadata: {
            campaign_id: String(campaign_id),
            tier_id: tier_id ?? '',
            backer_id: userId,
          },
        })
      } catch (chargeError) {
        logger.error('crowdfunding.pledges.charge', chargeError)
        res.status(402).json({
          error: t('pledges.paymentFailed', {}, { defaultValue: 'Payment processing failed' }),
          detail: chargeError instanceof Error ? chargeError.message : String(chargeError),
        })
        return
      }

      const pledgeResult = await create('pledges', {
        campaign_id,
        tier_id: tier_id ?? null,
        backer_id: userId,
        amount: Number(amount),
        status: 'active',
        payment_id: charge.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (tier_id) {
        const tier = await findById<Record<string, unknown>>('reward_tiers', tier_id)
        if (tier) {
          await updateById('reward_tiers', tier_id, {
            current_backers: Number(tier.current_backers) + 1,
            updated_at: new Date().toISOString(),
          })
        }
      }

      const newRaised = Number(campaign.raised_amount) + Number(amount)
      const updates: Record<string, unknown> = {
        raised_amount: newRaised,
        updated_at: new Date().toISOString(),
      }
      if (newRaised >= Number(campaign.goal_amount) && campaign.status === 'active') {
        updates.status = 'funded'
      }
      await updateById('campaigns', campaign_id, updates)

      const session = res.locals.session as { email?: string } | undefined
      if (session?.email) {
        try {
          await sendMail({
            from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
            to: session.email,
            subject: t(
              'pledges.confirmationSubject',
              { title: String(campaign.title) },
              { defaultValue: 'Pledge confirmed for {{title}}' },
            ),
            text: t(
              'pledges.confirmationBody',
              { amount: String(amount), title: String(campaign.title) },
              { defaultValue: 'Thank you for pledging ${{amount}} to {{title}}!' },
            ),
          })
        } catch (mailError) {
          logger.error('crowdfunding.pledges.confirmationEmail', mailError)
        }
      }

      const decorated = await decoratePledge(pledgeResult.data as Record<string, unknown>)
      res
        .status(201)
        .json({ ...decorated, payment_intent_id: charge.id, payment_intent_status: charge.status })
    } catch (error) {
      fail(res, error)
    }
  },
)

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const pledge = await findById<Record<string, unknown>>('pledges', id)
    if (!pledge) {
      res
        .status(404)
        .json({ error: t('pledges.notFound', {}, { defaultValue: 'Pledge not found' }) })
      return
    }
    if (pledge.backer_id !== userId) {
      res.status(403).json({
        error: t('pledges.notOwner', {}, { defaultValue: 'You can only cancel your own pledges' }),
      })
      return
    }
    if (pledge.status !== 'active') {
      res.status(400).json({
        error: t(
          'pledges.cannotCancel',
          {},
          { defaultValue: 'Pledge cannot be cancelled in current status' },
        ),
      })
      return
    }

    const campaign = await findById<Record<string, unknown>>(
      'campaigns',
      String(pledge.campaign_id),
    )
    if (campaign && campaign.status === 'funded') {
      res.status(400).json({
        error: t(
          'pledges.campaignFunded',
          {},
          { defaultValue: 'Cannot cancel pledge for a funded campaign' },
        ),
      })
      return
    }

    const result = await updateById('pledges', id, {
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })

    if (pledge.tier_id) {
      const tier = await findById<Record<string, unknown>>('reward_tiers', String(pledge.tier_id))
      if (tier && Number(tier.current_backers) > 0) {
        await updateById('reward_tiers', String(pledge.tier_id), {
          current_backers: Number(tier.current_backers) - 1,
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (campaign) {
      await updateById('campaigns', String(pledge.campaign_id), {
        raised_amount: Math.max(0, Number(campaign.raised_amount) - Number(pledge.amount)),
        updated_at: new Date().toISOString(),
      })
    }

    const decorated = await decoratePledge(result.data as Record<string, unknown>)
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.post('/:id/fulfill', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const pledge = await findById<Record<string, unknown>>('pledges', id)
    if (!pledge) {
      res
        .status(404)
        .json({ error: t('pledges.notFound', {}, { defaultValue: 'Pledge not found' }) })
      return
    }
    const campaign = await findById<Record<string, unknown>>(
      'campaigns',
      String(pledge.campaign_id),
    )
    if (!campaign || campaign.creator_id !== userId) {
      res.status(403).json({
        error: t(
          'campaigns.notOwner',
          {},
          { defaultValue: 'Only the campaign creator can edit this campaign' },
        ),
      })
      return
    }
    if (pledge.status !== 'active') {
      res.status(400).json({
        error: t(
          'pledges.cannotFulfill',
          {},
          { defaultValue: 'Only active pledges can be fulfilled' },
        ),
      })
      return
    }

    const result = await updateById('pledges', id, {
      status: 'fulfilled',
      updated_at: new Date().toISOString(),
    })
    const decorated = await decoratePledge(result.data as Record<string, unknown>)
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

export default router
