import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import { decorateDeals, decorateMerchant, decorateMerchants } from './_decorate.js'

const router = Router()

const applyMerchantSchema = z.object({
  business_name: z.string().min(1),
  business_description: z.string().optional(),
  contact_email: z.email().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
})

const updateMerchantSchema = z.object({
  business_name: z.string().optional(),
  business_description: z.string().optional(),
  contact_email: z.email().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  logo_url: z.string().optional(),
})

const statusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended', 'pending']),
})

// Apply to become a merchant — owner_user_id is the requesting user.
router.post('/apply', validateBody(applyMerchantSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const existing = await findOne('merchants', [{ field: 'user_id', operator: '=', value: userId }])
  if (existing) {
    res.status(400).json({ error: t('merchant.alreadyApplied') })
    return
  }

  const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE ?? '0.15')
  const result = await create<Record<string, unknown>>('merchants', {
    user_id: userId,
    business_name: req.body.business_name,
    business_description: req.body.business_description ?? null,
    contact_email: req.body.contact_email ?? null,
    contact_phone: req.body.contact_phone ?? null,
    address: req.body.address ?? null,
    website: req.body.website ?? null,
    status: 'pending',
    commission_rate: commissionRate,
    total_revenue: 0,
    total_deals: 0,
    rating: 0,
    review_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const row = (result.data ?? result) as Record<string, unknown>
  res.status(201).json(await decorateMerchant(row))
})

// Get the requesting user's merchant profile (authSelf-style: owner_user_id).
router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const merchant = await findOne<Record<string, unknown>>('merchants', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!merchant) {
    res.status(404).json({ error: t('merchant.notFound') })
    return
  }
  res.json(await decorateMerchant(merchant))
})

// List merchants (public catalog, requires auth for parity with deals).
router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'approved' }]
  const orderBy: OrderBy[] = [{ field: 'business_name', direction: 'asc' }]
  const items = await findMany<Record<string, unknown>>('merchants', { where, orderBy, limit: 100 })
  res.json(await decorateMerchants(items))
})

// Update logged-in user's merchant profile (authSelf-style: owner_user_id).
router.put('/me', validateBody(updateMerchantSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const merchant = await findOne<Record<string, unknown>>('merchants', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!merchant) {
    res.status(404).json({ error: t('merchant.notFound') })
    return
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (req.body.business_name !== undefined) updates.business_name = req.body.business_name
  if (req.body.business_description !== undefined)
    updates.business_description = req.body.business_description
  if (req.body.contact_email !== undefined) updates.contact_email = req.body.contact_email
  if (req.body.contact_phone !== undefined) updates.contact_phone = req.body.contact_phone
  if (req.body.address !== undefined) updates.address = req.body.address
  if (req.body.website !== undefined) updates.website = req.body.website
  if (req.body.logo_url !== undefined) updates.logo_url = req.body.logo_url

  const result = await updateById<Record<string, unknown>>(
    'merchants',
    merchant.id as string,
    updates,
  )
  const row = (result.data ?? result) as Record<string, unknown>
  res.json(await decorateMerchant(row))
})

// Merchant dashboard analytics — owner_user_id scoped.
router.get('/me/analytics', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const merchant = await findOne<Record<string, unknown>>('merchants', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!merchant) {
    res.status(404).json({ error: t('merchant.notFound') })
    return
  }

  const merchantId = merchant.id as string
  const totalDeals = await count('deals', [
    { field: 'merchant_id', operator: '=', value: merchantId },
  ])
  const activeDeals = await count('deals', [
    { field: 'merchant_id', operator: '=', value: merchantId },
    { field: 'status', operator: '=', value: 'active' },
  ])
  const totalRedemptions = await count('redemptions', [
    { field: 'merchant_id', operator: '=', value: merchantId },
  ])
  const redeemedCount = await count('redemptions', [
    { field: 'merchant_id', operator: '=', value: merchantId },
    { field: 'status', operator: '=', value: 'redeemed' },
  ])
  const pendingCount = await count('redemptions', [
    { field: 'merchant_id', operator: '=', value: merchantId },
    { field: 'status', operator: '=', value: 'purchased' },
  ])

  const recentRedemptions = await findMany('redemptions', {
    where: [{ field: 'merchant_id', operator: '=', value: merchantId }],
    orderBy: [{ field: 'purchased_at', direction: 'desc' }],
    limit: 10,
  })

  const commissionRate = Number(merchant.commission_rate ?? 0.15)
  const grossRevenue = Number(merchant.total_revenue ?? 0)
  const netRevenue = Math.round(grossRevenue * (1 - commissionRate))

  res.json({
    totalDeals,
    activeDeals,
    totalRedemptions,
    redeemedCount,
    pendingCount,
    grossRevenue,
    netRevenue,
    commissionRate,
    recentRedemptions,
  })
})

// Public merchant detail.
router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const merchant = await findById<Record<string, unknown>>('merchants', getParamId(req))
  if (!merchant) {
    res.status(404).json({ error: t('merchant.notFound') })
    return
  }

  res.json(await decorateMerchant(merchant))
})

router.get('/:id/deals', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const status = req.query.status ? String(req.query.status) : 'active'
  const where: WhereCondition[] = [{ field: 'merchant_id', operator: '=', value: getParamId(req) }]
  if (status !== 'all') where.push({ field: 'status', operator: '=', value: status })
  const items = await findMany<Record<string, unknown>>('deals', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 50,
  })
  res.json(await decorateDeals(items, { userId }))
})

// Admin: approve/reject/suspend a merchant. Status transitions are an editorial
// trust decision over a shared (non owner-scoped) surface — a bare authenticated
// session is NOT sufficient, or any merchant could self-approve / sabotage a
// competitor. Gated by requireAdmin (role==='admin' or an ADMIN_EMAILS owner):
// 401 when no session, 403 when authenticated-but-not-admin.
router.put(
  '/:id/status',
  requireAdmin,
  validateBody(statusSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const id = getParamId(req)
    const existing = await findById('merchants', id)
    if (!existing) {
      res.status(404).json({ error: t('merchant.notFound') })
      return
    }

    const result = await updateById<Record<string, unknown>>('merchants', id, {
      status: req.body.status,
      updated_at: new Date(),
    })
    const row = (result.data ?? result) as Record<string, unknown>
    res.json(await decorateMerchant(row))
  },
)

export default router
