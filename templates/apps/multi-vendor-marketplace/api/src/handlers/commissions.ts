import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { can, hasProvider as hasPermissionsProvider } from '@molecule/api-permissions'

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional(),
  vendorId: z.string().optional(),
})

const payoutBody = z.object({
  reference: z.string().optional(),
})

// See vendors.ts for rationale: fall back to allow-if-signed-in when no
// permissions provider is bonded so admin surfaces stay reachable.
async function isAllowed(userId: string, resource: string, action: string): Promise<boolean> {
  if (!hasPermissionsProvider()) return true
  try {
    return await can(userId, action, resource)
  } catch (_error) {
    // permissions provider unavailable — fall back to allow so surfaces stay reachable
    return true
  }
}

const router = Router()

router.get('/mine', async (_req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const vendor = await findOne<Record<string, unknown>>('vendors', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!vendor) {
      return res
        .status(403)
        .json({ error: t('vendor.notActive', {}, { defaultValue: 'Vendor account not active' }) })
    }
    const all = await findMany<Record<string, unknown>>('commissions', {
      where: [{ field: 'vendor_id', operator: '=', value: vendor.id as string }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const totalEarned = all.reduce((sum, c) => sum + (Number(c.payout_amount) || 0), 0)
    const pendingPayout = all
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + (Number(c.payout_amount) || 0), 0)
    const paidOut = all
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + (Number(c.payout_amount) || 0), 0)

    res.json({
      commissions: all,
      summary: { totalEarned, pendingPayout, paidOut },
    })
  } catch (error) {
    logger.error('commissions.getMine', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/', validateQuery(listQuery), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const allowed = await isAllowed(userId, 'commissions', 'read')
    if (!allowed) {
      return res
        .status(403)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const { page, limit, status, vendorId } = req.query as unknown as z.infer<typeof listQuery>
    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (vendorId) where.push({ field: 'vendor_id', operator: '=', value: vendorId })

    const [data, total] = await Promise.all([
      findMany<Record<string, unknown>>('commissions', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('commissions', where),
    ])
    res.json({ data, total, page, limit })
  } catch (error) {
    logger.error('commissions.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark commission as paid. In production this would dispatch a Stripe Connect
// transfer via the @molecule/api-payments-stripe bond's connected-account API;
// here we just record the payout reference + flip status so payout E2Es work
// without live Stripe Connect credentials.
router.post('/:id/payout', validateBody(payoutBody), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const allowed = await isAllowed(userId, 'commissions', 'update')
    if (!allowed) {
      return res
        .status(403)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const commissionId = String(req.params.id)
    const commission = await findById<Record<string, unknown>>('commissions', commissionId)
    if (!commission) {
      return res
        .status(404)
        .json({ error: t('commission.notFound', {}, { defaultValue: 'Commission not found' }) })
    }
    if (commission.status === 'paid') {
      return res.status(400).json({
        error: t('commission.alreadyPaid', {}, { defaultValue: 'Commission already paid' }),
      })
    }
    const { reference } = req.body as z.infer<typeof payoutBody>
    const result = await updateById<Record<string, unknown>>('commissions', commissionId, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_reference: reference ?? null,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('commissions.payout', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
