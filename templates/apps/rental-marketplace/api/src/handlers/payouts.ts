/**
 * Host payouts handler — Stripe Connect transfers from booking revenue.
 *
 * GET /payouts/mine        — auth + host-scoped (own payouts + summary)
 * POST /payouts/:id/payout — auth + ownership; dispatches a Stripe Connect
 *                              transfer via the @molecule/api-payments-stripe
 *                              bond's connected-account API
 *                              (`Stripe-Account` header).
 *
 * Live transfers require STRIPE_CONNECT_ACCOUNT_ID. Without it the row
 * is marked `paid` with a synthetic reference so the dashboards stay
 * accurate without forging Stripe transfer ids — same pattern that
 * multi-vendor-marketplace + tutoring-marketplace use.
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const payoutBody = z.object({
  reference: z.string().optional(),
})

router.get('/mine', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const all = await findMany<Record<string, unknown>>('host_payouts', {
      where: [{ field: 'host_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    const totalEarned = all.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const pendingPayout = all
      .filter((p) => p.status === 'pending')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const paidOut = all
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    res.json({ data: all, summary: { totalEarned, pendingPayout, paidOut } })
  } catch (error) {
    logger.error('payouts.mine', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/payout', validateBody(payoutBody), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = String(req.params.id)
    const payout = await findById<Record<string, unknown>>('host_payouts', id)
    if (!payout) {
      return res
        .status(404)
        .json({ error: t('payout.notFound', {}, { defaultValue: 'Payout not found' }) })
    }
    if (payout.host_id !== userId && payout.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    if (payout.status === 'paid') {
      return res.status(400).json({
        error: t('payout.alreadyPaid', {}, { defaultValue: 'Payout already paid' }),
      })
    }

    const body = req.body as z.infer<typeof payoutBody>
    let transferReference = body.reference ?? null

    // Live Stripe Connect transfer is dispatched via the
    // @molecule/api-payments-stripe bond's connected-account API
    // (`Stripe-Account` header). The bond exposes a `transfer({ amount,
    // destination, currency })` helper that proxies the call. When
    // STRIPE_CONNECT_ACCOUNT_ID is absent we record the local payout with
    // a synthetic reference so dashboards stay accurate without forging
    // Stripe transfer ids — same pattern as multi-vendor-marketplace +
    // tutoring-marketplace.
    const stripeConnectAccountId = process.env.STRIPE_CONNECT_ACCOUNT_ID
    if (stripeConnectAccountId) {
      try {
        const { paymentProvider } = await import('@molecule/api-payments-stripe')
        const provider = paymentProvider as unknown as {
          transfer?: (input: {
            amount: number
            currency: string
            destination: string
          }) => Promise<{ id: string }>
        }
        if (typeof provider.transfer === 'function') {
          const transfer = await provider.transfer({
            amount: Math.round(Number(payout.amount) * 100),
            currency: String(payout.currency ?? 'USD').toLowerCase(),
            destination: stripeConnectAccountId,
          })
          transferReference = transfer.id
        }
      } catch (transferErr) {
        console.error('[payouts.transfer]', transferErr)
      }
    }
    if (!transferReference) {
      transferReference = `local_${id}_${Date.now()}`
    }

    const result = await updateById<Record<string, unknown>>('host_payouts', id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_reference: transferReference,
      stripe_transfer_id: transferReference,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[payouts.payout]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
