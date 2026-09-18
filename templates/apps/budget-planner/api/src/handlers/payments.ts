/**
 * Payment-history endpoint backing the Billing → Invoices table.
 *
 * The molecule `@molecule/api-resource-payment` package owns the
 * `payments` table writes (Stripe webhook → row inserted on each
 * invoice.paid). This handler reads that table per-user and shapes the
 * rows to the columns the Billing page needs (date / description /
 * amount / status / receipt URL).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface PaymentRow {
  id: string
  createdAt: string | Date
  updatedAt: string | Date
  userId: string
  transactionId: string | null
  productId: string | null
  platformKey: string | null
  data: Record<string, unknown> | null
  receipt: string | null
}

function pickAmount(p: PaymentRow): { amount_cents: number; currency: string } {
  const data = (p.data ?? {}) as Record<string, unknown>
  const amountRaw = data.amount_total ?? data.amount_paid ?? data.amount ?? 0
  const amount_cents = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw) || 0
  const currency = typeof data.currency === 'string' ? data.currency.toUpperCase() : 'USD'
  return { amount_cents, currency }
}

function pickDescription(p: PaymentRow): string {
  const data = (p.data ?? {}) as Record<string, unknown>
  if (typeof data.description === 'string' && data.description) return data.description
  if (typeof p.productId === 'string' && p.productId) return p.productId
  return t('billing.invoice.defaultDescription', {}, { defaultValue: 'Subscription charge' })
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const rows = await findMany<PaymentRow>('payments', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  })
  const out = rows.map((p) => {
    const { amount_cents, currency } = pickAmount(p)
    const data = (p.data ?? {}) as Record<string, unknown>
    const status = typeof data.status === 'string' ? data.status : 'paid'
    const created = p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
    return {
      id: p.id,
      transactionId: p.transactionId,
      platformKey: p.platformKey,
      productId: p.productId,
      description: pickDescription(p),
      created_at: created,
      amount_cents,
      currency,
      status,
      receiptUrl:
        typeof data.hosted_invoice_url === 'string'
          ? data.hosted_invoice_url
          : typeof data.receipt_url === 'string'
            ? data.receipt_url
            : (p.receipt ?? null),
    }
  })
  res.json(out)
})

export default router
