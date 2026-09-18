import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import { isDealLive } from './_deal-window.js'
import { decorateDeal, decorateDeals } from './_decorate.js'

const router = Router()

const createDealSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category_id: z.string().optional(),
  original_price: z.number(),
  discounted_price: z.number(),
  total_quantity: z.number(),
  expires_at: z.string(),
  starts_at: z.string().optional(),
  terms: z.string().optional(),
  address: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateDealSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  original_price: z.number().optional(),
  discounted_price: z.number().optional(),
  total_quantity: z.number().optional(),
  expires_at: z.string().optional(),
  terms: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// List active deals — public for any authenticated user. Filters by
// category, minDiscount, and (optional) lat/lng radius.
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const { category, lat, lng, radius, sort, minDiscount, merchant_id } = req.query

  const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
  if (category) where.push({ field: 'category_id', operator: '=', value: String(category) })
  if (merchant_id) where.push({ field: 'merchant_id', operator: '=', value: String(merchant_id) })
  if (minDiscount)
    where.push({ field: 'discount_percent', operator: '>=', value: Number(minDiscount) })

  const orderField = sort && String(sort).startsWith('-') ? String(sort).slice(1) : 'created_at'
  const direction: 'asc' | 'desc' = sort && String(sort).startsWith('-') ? 'desc' : 'desc'
  const orderBy: OrderBy[] = [{ field: orderField, direction }]

  let items = await findMany<Record<string, unknown>>('deals', { where, orderBy, limit: 100 })

  // Filter to the live window in app-layer (DataStore lacks date comparisons): hide deals that have
  // expired OR have not reached their scheduled `starts_at` yet.
  const now = Date.now()
  items = items.filter((d) => isDealLive(d, now))

  if (lat && lng && radius) {
    const la = Number(lat)
    const lo = Number(lng)
    const r = Number(radius)
    items = items.filter((d) => {
      const dlat = d.latitude as number | null
      const dlng = d.longitude as number | null
      if (dlat == null || dlng == null) return false
      return haversineDistance(la, lo, dlat, dlng) <= r
    })
  }
  res.json(await decorateDeals(items, { userId }))
})

// Public list — no auth required, used on the marketing Landing page.
// Returns a small slice of the most recently-listed active deals so the
// page renders something even before the visitor signs up.
router.get('/public', async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit ?? 4)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.trunc(limitRaw)), 12) : 4

  const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]

  let items = await findMany<Record<string, unknown>>('deals', { where, orderBy, limit: 50 })
  const now = Date.now()
  items = items.filter((d) => isDealLive(d, now))

  res.json(await decorateDeals(items.slice(0, limit), {}))
})

router.get('/featured', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const where: WhereCondition[] = [
    { field: 'status', operator: '=', value: 'active' },
    { field: 'featured', operator: '=', value: true },
  ]
  const orderBy: OrderBy[] = [{ field: 'discount_percent', direction: 'desc' }]
  const items = await findMany<Record<string, unknown>>('deals', { where, orderBy, limit: 8 })
  const live = items.filter((d) => isDealLive(d))
  res.json(await decorateDeals(live, { userId }))
})

router.get('/expiring-soon', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
  const orderBy: OrderBy[] = [{ field: 'expires_at', direction: 'asc' }]
  const items = await findMany<Record<string, unknown>>('deals', { where, orderBy, limit: 8 })
  const live = items.filter((d) => isDealLive(d))
  res.json(await decorateDeals(live, { userId }))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const deal = await findById<Record<string, unknown>>('deals', getParamId(req))
  if (!deal) {
    res.status(404).json({ error: t('deal.notFound') })
    return
  }

  res.json(await decorateDeal(deal, { userId }))
})

// Create deal — requires the requesting user to own an approved merchant.
router.post('/', validateBody(createDealSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const merchant = await findOne<Record<string, unknown>>('merchants', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'approved' },
  ])
  if (!merchant) {
    res.status(403).json({ error: t('deal.merchantRequired') })
    return
  }

  const op = Number(req.body.original_price)
  const dp = Number(req.body.discounted_price)
  const discountPercent = op > 0 ? Math.round((1 - dp / op) * 100) : 0

  const result = await create<Record<string, unknown>>('deals', {
    merchant_id: merchant.id,
    category_id: req.body.category_id ?? null,
    title: req.body.title,
    description: req.body.description ?? null,
    terms: req.body.terms ?? null,
    original_price: Math.round(op * 100),
    discounted_price: Math.round(dp * 100),
    discount_percent: discountPercent,
    total_quantity: Number(req.body.total_quantity),
    remaining_quantity: Number(req.body.total_quantity),
    starts_at: req.body.starts_at ? new Date(req.body.starts_at) : null,
    expires_at: new Date(req.body.expires_at),
    address: req.body.address ?? null,
    tags: req.body.tags ?? [],
    images: JSON.stringify([]),
    thumbnails: JSON.stringify([]),
    status: 'active',
    featured: false,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const row = (result.data ?? result) as Record<string, unknown>
  res.status(201).json(await decorateDeal(row, { userId }))
})

// Update deal — requires the requesting user to own the merchant for this
// deal (owner_user_id check via merchants.user_id).
router.put('/:id', validateBody(updateDealSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const id = getParamId(req)
  const deal = await findById<Record<string, unknown>>('deals', id)
  if (!deal) {
    res.status(404).json({ error: t('deal.notFound') })
    return
  }

  const merchant = await findById<Record<string, unknown>>('merchants', deal.merchant_id as string)
  if (!merchant || merchant.user_id !== userId) {
    res.status(403).json({ error: t('deal.unauthorized') })
    return
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (req.body.title !== undefined) updates.title = req.body.title
  if (req.body.description !== undefined) updates.description = req.body.description
  if (req.body.terms !== undefined) updates.terms = req.body.terms
  if (req.body.status !== undefined) updates.status = req.body.status
  if (req.body.tags !== undefined) updates.tags = req.body.tags
  if (req.body.expires_at !== undefined) updates.expires_at = new Date(req.body.expires_at)
  if (req.body.original_price !== undefined) {
    updates.original_price = Math.round(Number(req.body.original_price) * 100)
  }
  if (req.body.discounted_price !== undefined) {
    updates.discounted_price = Math.round(Number(req.body.discounted_price) * 100)
  }
  if (req.body.original_price !== undefined || req.body.discounted_price !== undefined) {
    const op =
      req.body.original_price !== undefined
        ? Number(req.body.original_price) * 100
        : (deal.original_price as number)
    const dp =
      req.body.discounted_price !== undefined
        ? Number(req.body.discounted_price) * 100
        : (deal.discounted_price as number)
    updates.discount_percent = op > 0 ? Math.round((1 - dp / op) * 100) : 0
  }
  if (req.body.total_quantity !== undefined) {
    const sold = (deal.total_quantity as number) - (deal.remaining_quantity as number)
    updates.total_quantity = Number(req.body.total_quantity)
    updates.remaining_quantity = Math.max(0, Number(req.body.total_quantity) - sold)
  }

  const result = await updateById<Record<string, unknown>>('deals', id, updates)
  const row = (result.data ?? result) as Record<string, unknown>
  res.json(await decorateDeal(row, { userId }))
})

// Soft-delete (archive) deal — owner_user_id check via merchant ownership.
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }

  const id = getParamId(req)
  const deal = await findById<Record<string, unknown>>('deals', id)
  if (!deal) {
    res.status(404).json({ error: t('deal.notFound') })
    return
  }

  const merchant = await findById<Record<string, unknown>>('merchants', deal.merchant_id as string)
  if (!merchant || merchant.user_id !== userId) {
    res.status(403).json({ error: t('deal.unauthorized') })
    return
  }

  await updateById('deals', id, { status: 'archived', updated_at: new Date() })
  res.status(204).end()
})

// Admin: toggle a deal's `featured` curation flag. `featured` is an editorial
// promotion (homepage placement) over the shared catalog, NOT something a deal's
// own merchant may set — so it lives on a dedicated admin-gated route instead of
// the merchant-owned PUT /:id edit path. Gated by requireAdmin (role==='admin'
// or an ADMIN_EMAILS owner): 401 when no session, 403 when authenticated but not
// an admin. Mirrors crowdfunding's POST /:id/feature.
router.post('/:id/feature', requireAdmin, async (req: Request, res: Response) => {
  const id = getParamId(req)
  const deal = await findById<Record<string, unknown>>('deals', id)
  if (!deal) {
    res.status(404).json({ error: t('deal.notFound') })
    return
  }

  const next = !(deal.featured as boolean)
  const result = await updateById<Record<string, unknown>>('deals', id, {
    featured: next,
    updated_at: new Date(),
  })
  const row = (result.data ?? result) as Record<string, unknown>
  res.json(await decorateDeal(row, {}))
})

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export default router
