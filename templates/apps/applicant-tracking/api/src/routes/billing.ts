import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { get as getBond } from '@molecule/api-bond'
import { createBillingRouter, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { getProvider as getTierRegistry } from '@molecule/api-entitlements'
import { logger } from '@molecule/api-logger'
import type { PaymentProvider } from '@molecule/api-payments'

import {
  type ApplicantTrackingLimits,
  applicantTrackingPlanKeys,
  getPricingTiers,
} from '../tiers.js'

const router = Router()

const seatsSchema = z.object({
  seats: z.number().int().min(1).max(999),
})

const upgradeSchema = z.object({
  plan: z.string().min(1).max(64),
})

interface UserRow {
  planKey?: string | null
  seats?: number | null
}

interface PaymentRow {
  id: string
  createdAt: string
  productId?: string | null
  data?: Record<string, unknown> | null
}

/**
 * GET /billing/plan — current plan summary for the signed-in user.
 * Returns the shape applicant-tracking's Billing.tsx expects:
 * `{ name, per_seat_cents, seats, total_cents, next_charge_cents, ... }`.
 */
router.get('/plan', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const user = await findById<UserRow>('users', userId)
  const registry = getTierRegistry<ApplicantTrackingLimits>()
  const tier = registry.findTier(user?.planKey ?? null)
  const pricing = getPricingTiers().find((p) => p.key === tier.planKey)
  const seats = user?.seats ?? 1
  const monthlyPrice = pricing?.prices.find((p) => p.period === 'month')
  const perSeatCents = monthlyPrice ? parseCents(monthlyPrice.price) : 0
  const totalCents = perSeatCents * seats
  res.json({
    name: tier.name,
    per_seat_cents: perSeatCents,
    seats,
    total_cents: totalCents,
    next_charge_cents: totalCents,
    next_charge_date: null,
    card_brand: null,
    card_last4: null,
  })
})

/**
 * GET /billing/usage — feature-by-feature usage breakdown driven by
 * the bonded entitlements tier limits.
 */
router.get('/usage', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const user = await findById<UserRow>('users', userId)
  const registry = getTierRegistry<ApplicantTrackingLimits>()
  const tier = registry.findTier(user?.planKey ?? null)
  const limits = (tier.limits ?? {}) as unknown as Record<string, number | null>
  const items = Object.entries(limits).map(([key, max]) => ({
    key,
    label: humanize(key),
    value: 0,
    max,
    hint: max === null ? 'Unlimited' : `Up to ${max}`,
  }))
  res.json({ data: items })
})

/**
 * GET /billing/invoices — payment history for the signed-in user from
 * the `payments` table populated by the Stripe webhook glue.
 */
router.get('/invoices', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const payments = await findMany<PaymentRow>('payments', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 50,
  })
  const data = payments.map((p) => ({
    id: p.id,
    date: p.createdAt,
    amount_cents: extractAmountCents(p.data),
    status: extractStatus(p.data),
    url: extractInvoiceUrl(p.data),
  }))
  res.json({ data })
})

/**
 * POST /billing/seats — persist the signed-in user's seat count.
 * The `users.seats` column is created by migration
 * 1779000000002_add_user_seats.sql; the free tier is single-seat by
 * convention but the count itself is user-manageable on any plan.
 */
router.post('/seats', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const parsed = seatsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      errors: parsed.error.issues,
    })
    return
  }
  try {
    await updateById('users', userId, { seats: parsed.data.seats })
    logger.info('billing.seats_updated', { userId, seats: parsed.data.seats })
    res.json({ seats: parsed.data.seats })
  } catch (err) {
    logger.error('billing.seats_update_failed', err)
    res.status(500).json({ error: 'Could not update seats. Try again later.' })
  }
})

/**
 * POST /billing/upgrade — start the plan-upgrade flow for a paid tier.
 * With Stripe configured (a `stripePriceId` on the tier's prices) this
 * delegates to the bonded payment provider exactly like `POST /billing/checkout`
 * and returns `{ checkoutUrl }` or `{ updated: true }`. Without Stripe
 * configuration the flow cannot start: the response is
 * `{ unconfigured: true }` (NOT an error) so the UI can explain instead of
 * the browser logging a failed request.
 */
router.post('/upgrade', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const parsed = upgradeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      errors: parsed.error.issues,
    })
    return
  }
  const tier = getPricingTiers().find((p) => p.key === parsed.data.plan)
  const price = tier?.prices.find((p) => p.stripePriceId) ?? tier?.prices[0]
  const priceId = price?.stripePriceId
  if (!priceId) {
    logger.info('billing.upgrade_unconfigured', { userId, plan: parsed.data.plan })
    res.json({ unconfigured: true })
    return
  }
  const provider = getBond<PaymentProvider>('payments', 'stripe')
  if (!provider?.updateSubscription) {
    logger.info('billing.upgrade_unconfigured', { userId, plan: parsed.data.plan })
    res.json({ unconfigured: true })
    return
  }
  try {
    const result = await provider.updateSubscription({ userId, newProductId: priceId })
    if (result.checkoutUrl) {
      logger.info('billing.upgrade_checkout_started', { userId, plan: parsed.data.plan })
      res.json({ checkoutUrl: result.checkoutUrl })
      return
    }
    if (result.updated) {
      logger.info('billing.upgrade_applied', { userId, plan: parsed.data.plan })
      res.json({ updated: true, subscription: result.subscription })
      return
    }
    res.status(502).json({ error: 'Could not start checkout. Try again later.' })
  } catch (err) {
    logger.error('billing.upgrade_failed', err)
    res.status(500).json({ error: 'Could not start checkout. Try again later.' })
  }
})

/**
 * POST /billing/card-link — start the update-card flow. The bonded payment
 * provider interface (`PaymentProvider`) exposes no hosted card-update or
 * billing-portal session, so there is currently no flow to start: the honest
 * contract is `{ unconfigured: true }` (200), which the UI renders as a
 * neutral explanation instead of a failed request in the console.
 */
router.post('/card-link', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  logger.info('billing.card_link_unavailable', { userId })
  res.json({ unconfigured: true })
})

router.use(
  createBillingRouter<ApplicantTrackingLimits>({
    getPricingTiers,
    planKeys: applicantTrackingPlanKeys,
  }),
)

function parseCents(priceStr: string): number {
  const match = priceStr.match(/\$?([\d.]+)/)
  if (!match) return 0
  return Math.round(parseFloat(match[1] ?? '0') * 100)
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function extractAmountCents(data: Record<string, unknown> | null | undefined): number {
  if (!data) return 0
  const raw =
    (data as { amount?: number; amount_paid?: number; amountCents?: number }).amount_paid ??
    (data as { amount?: number }).amount ??
    (data as { amountCents?: number }).amountCents
  return typeof raw === 'number' ? raw : 0
}

function extractStatus(
  data: Record<string, unknown> | null | undefined,
): 'paid' | 'open' | 'failed' {
  if (!data) return 'paid'
  const status = (data as { status?: string }).status
  if (status === 'open' || status === 'failed') return status
  return 'paid'
}

function extractInvoiceUrl(data: Record<string, unknown> | null | undefined): string | undefined {
  if (!data) return undefined
  const url =
    (data as { invoice_url?: string; hosted_invoice_url?: string }).invoice_url ??
    (data as { hosted_invoice_url?: string }).hosted_invoice_url
  return typeof url === 'string' ? url : undefined
}

export default router
