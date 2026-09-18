import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { InvoiceBillingLimits } from '../tiers.js'
import { decoratePayment } from './_decorate.js'
import { ensureDemoSeeded } from './_seed.js'

const router = Router()

const createPaymentSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['stripe', 'bank', 'paypal', 'manual']).default('manual'),
  reference: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    await ensureDemoSeeded(userId)

    const { invoice_id } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (invoice_id) {
      where.push({ field: 'invoice_id', operator: '=', value: invoice_id })
    }

    const payments = await findMany<Record<string, unknown>>('invoice_payments', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    res.json(payments.map((p) => decoratePayment(p as never)))
  } catch (error) {
    logger.error('payments.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<InvoiceBillingLimits>({
    limitType: 'maxPayments',
    getLimit: (limits) => limits.maxPayments,
    getCurrent: async (userId) =>
      count('invoice_payments', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { invoice_id, amount, method, reference } = req.body as {
        invoice_id: string
        amount: number
        method: 'stripe' | 'bank' | 'paypal' | 'manual'
        reference?: string
      }

      const invoice = await findById<Record<string, unknown>>('invoices', invoice_id)
      if (!invoice || invoice.user_id !== userId) {
        return res.status(404).json({ error: t('payments.invoiceNotFound') })
      }

      // A voided invoice is cancelled — recording a payment against it would both
      // resurrect it (the status flips back to paid/partial below) and book money
      // against a nullified invoice. Refuse it.
      if (String(invoice.status) === 'void') {
        return res.status(409).json({
          error: t(
            'payments.invoiceVoided',
            {},
            {
              defaultValue: 'Cannot record a payment against a voided invoice',
            },
          ),
        })
      }

      // Real Stripe charges flow through the user-resource billing path
      // (`/api/billing/checkout` → `@molecule/api-payments-stripe` verifier
      // + webhook). This handler only records the ledger row that closes
      // out the invoice. method=`stripe` therefore tags the row with the
      // provider identifier the webhook would normally fill in via
      // `reference`. See INVENTORY user flow 2 for the canonical wiring.

      const result = await create('invoice_payments', {
        user_id: userId,
        invoice_id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        amount,
        method: method || 'manual',
        reference: reference ?? null,
        status: 'completed',
        created_at: new Date(),
      })

      const newAmountPaid = Number(invoice.amount_paid ?? 0) + amount
      const total = Number(invoice.total ?? 0)
      await updateById('invoices', invoice_id, {
        amount_paid: newAmountPaid,
        status: newAmountPaid >= total ? 'paid' : 'partial',
      })

      const created = result.data as Record<string, unknown> | null
      if (!created) return res.status(500).json({ error: t('errors.internalServer') })
      res.status(201).json(decoratePayment(created as never))
    } catch (error) {
      logger.error('payments.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
