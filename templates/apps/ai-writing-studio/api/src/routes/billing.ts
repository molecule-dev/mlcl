import { type Request, type Response, Router } from 'express'

import { createBillingRouter } from '@molecule/api-bonds-default-express'
import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { getProvider as getTierRegistry } from '@molecule/api-entitlements'

import { type AiWritingStudioLimits, aiWritingStudioPlanKeys, getPricingTiers } from '../tiers.js'

const router = Router()

interface UserRow {
  planKey?: string | null
}

interface PaymentRow {
  id: string
  createdAt: string
  transactionId?: string | null
  productId?: string | null
  data?: Record<string, unknown> | null
  receipt?: string | null
}

/** Best-effort amount (in cents) from the stored platform payload. */
function extractAmountCents(data: Record<string, unknown> | null | undefined): number | null {
  if (!data) return null
  const raw =
    (data as { amount_paid?: number }).amount_paid ??
    (data as { amount?: number }).amount ??
    (data as { amountCents?: number }).amountCents
  return typeof raw === 'number' ? raw : null
}

/** Payment status from the stored platform payload; defaults to `paid`. */
function extractStatus(data: Record<string, unknown> | null | undefined): string {
  const status = data ? (data as { status?: unknown }).status : undefined
  return typeof status === 'string' && status.length > 0 ? status : 'paid'
}

/** Hosted receipt/invoice URL from the stored platform payload, if any. */
function extractReceiptUrl(
  row: PaymentRow,
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (typeof row.receipt === 'string' && /^https?:\/\//.test(row.receipt)) return row.receipt
  if (!data) return null
  const url =
    (data as { receipt_url?: string }).receipt_url ??
    (data as { hosted_invoice_url?: string }).hosted_invoice_url ??
    (data as { invoice_url?: string }).invoice_url
  return typeof url === 'string' ? url : null
}

/**
 * GET /billing/summary — current plan + invoice history for the
 * signed-in user. Returns the shape the Billing page consumes:
 * `{ plan: { planKey, name, isFree, limits }, invoices: [{ id,
 * transactionId, productId, amountCents, status, receiptUrl, createdAt }] }`.
 *
 * Plan info is sourced from the bonded entitlements registry (so it
 * reflects whatever tier ladder this app declares); invoices come from
 * the `payments` table populated by the Stripe webhook glue in
 * `@molecule/api-resource-user`.
 */
router.get('/summary', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const user = await findById<UserRow>('users', userId)
  const registry = getTierRegistry<AiWritingStudioLimits>()
  const tier = registry.findTier(user?.planKey ?? null)
  const payments = await findMany<PaymentRow>('payments', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 50,
  })
  res.json({
    plan: {
      planKey: tier.planKey,
      name: tier.name,
      isFree: tier.category === 'free',
      limits: tier.limits,
    },
    invoices: payments.map((p) => ({
      id: p.id,
      transactionId: p.transactionId ?? '',
      productId: p.productId ?? null,
      amountCents: extractAmountCents(p.data),
      status: extractStatus(p.data),
      receiptUrl: extractReceiptUrl(p, p.data),
      createdAt: p.createdAt,
    })),
  })
})

router.use(
  createBillingRouter<AiWritingStudioLimits>({
    getPricingTiers,
    planKeys: aiWritingStudioPlanKeys,
  }),
)

export default router
