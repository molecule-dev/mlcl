/**
 * Billing handler — returns the current plan + payment history derived
 * from the user record and the `payments` table.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { getPricingTiers, tierRegistry } from '../tiers.js'

const router = Router()

interface UserRow {
  planKey?: string | null
  planExpiresAt?: string | null
  planAutoRenews?: boolean | null
}

interface PaymentRow {
  id: string
  createdAt: string
  productId?: string | null
  data?: Record<string, unknown> | null
}

router.get('/summary', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const user = await findById<UserRow>('users', userId)
  const planKey = user?.planKey ?? null
  // Resolve the plan through the tier registry so labels/prices always
  // agree with tiers.ts (`findTier` falls back to the free tier for
  // null/unknown keys). `key` is the tier CATEGORY ('free'|'pro'|'team'),
  // matching the keys served by GET /billing/tiers — the Billing page
  // compares the two to mark the current plan.
  const tier = tierRegistry.findTier(planKey)
  const period: 'month' | 'year' = planKey?.endsWith('Yearly') ? 'year' : 'month'
  const pricingTier = getPricingTiers().find((p) => p.key === tier.category)
  const price =
    pricingTier?.prices.find((p) => p.period === period) ?? pricingTier?.prices[0] ?? null

  const payments = await findMany<PaymentRow>('payments', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 24,
  })

  const history = (payments as PaymentRow[]).map((p) => {
    const data = (p.data as Record<string, unknown> | null) ?? {}
    const amount = (data.amount as string) ?? (data.total as string) ?? '$0.00'
    const description = (data.description as string) ?? p.productId ?? 'Subscription'
    const status = (data.status as string) ?? 'paid'
    return {
      id: p.id,
      date: p.createdAt,
      description,
      amount,
      status,
    }
  })

  res.json({
    plan: {
      key: tier.category,
      label: tier.name,
      price: price?.price ?? '$0',
      expires_at: user?.planExpiresAt ?? null,
      auto_renews: Boolean(user?.planAutoRenews),
    },
    history,
  })
})

export default router
