import { type Request, type Response, Router } from 'express'

import { createBillingRouter } from '@molecule/api-bonds-default-express'
import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { getProvider as getTierRegistry } from '@molecule/api-entitlements'

import {
  type ApplicantTrackingLimits,
  applicantTrackingPlanKeys,
  getPricingTiers,
} from '../tiers.js'

const router = Router()

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
