import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { resize } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { deleteDocument, index } from '@molecule/api-search'

import type { AuctionPlatformLimits } from '../tiers.js'
import { notificationEnabled } from './_notify.js'

async function ensureWonOrder(args: {
  listingId: string
  buyerId: string
  sellerId: string
  amount: number
}): Promise<void> {
  const existing = await findMany('won_orders', {
    where: [
      { field: 'listing_id', operator: '=', value: args.listingId },
      { field: 'buyer_id', operator: '=', value: args.buyerId },
    ],
    limit: 1,
  }).catch(() => [])
  if (existing.length > 0) return
  try {
    await create('won_orders', {
      listing_id: args.listingId,
      buyer_id: args.buyerId,
      seller_id: args.sellerId,
      amount: args.amount,
      status: 'pending_payment',
    })
  } catch (err) {
    logger.error('listings.ensureWonOrder failed', err)
  }
}

async function notifyUser(args: { userId: string; type: string; entityId: string }): Promise<void> {
  try {
    if (!(await notificationEnabled(args.userId, args.type))) return
    await create('notifications', {
      user_id: args.userId,
      type: args.type,
      entity_id: args.entityId,
    })
  } catch (err) {
    logger.error('listings.notifyUser failed', err)
  }
}

const router = Router()

/**
 * Postgres bigint columns come back as strings from the pg driver because
 * the bigint range exceeds JS safe integers. Listing prices and bid counts
 * are well within Number.MAX_SAFE_INTEGER, so we coerce them so the API
 * surface (and the E2E tests) sees plain numbers.
 */
const NUMERIC_LISTING_FIELDS = [
  'starting_price',
  'reserve_price',
  'buy_now_price',
  'current_price',
  'bid_count',
] as const

function normalizeListing<T extends Record<string, unknown> | null>(row: T): T {
  if (!row) return row
  const out: Record<string, unknown> = { ...row }
  for (const f of NUMERIC_LISTING_FIELDS) {
    const v = out[f]
    if (v === null || v === undefined) continue
    if (typeof v === 'string') out[f] = Number(v)
  }
  return out as T
}

function normalizeListings<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => normalizeListing(r))
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  sort: z.enum(['ending_soon', 'newest', 'most_bids']).default('newest'),
})

const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  category: z.string().default('general'),
  startingPrice: z.number().positive(),
  reservePrice: z.number().positive().optional(),
  buyNowPrice: z.number().positive().optional(),
  duration: z.number().positive(),
})

const imageUploadSchema = z.object({
  image: z.string().min(1),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, category, sort } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where = [{ field: 'status', operator: '=' as const, value: 'active' }]
    if (category) {
      where.push({ field: 'category', operator: '=' as const, value: category })
    }
    const orderBy =
      sort === 'ending_soon'
        ? [{ field: 'end_time', direction: 'asc' as const }]
        : sort === 'most_bids'
          ? [{ field: 'bid_count', direction: 'desc' as const }]
          : [{ field: 'created_at', direction: 'desc' as const }]

    const listings = await findMany<Record<string, unknown>>('listings', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy,
    })
    res.json({ data: normalizeListings(listings) })
  } catch (error) {
    logger.error('listings.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const listing = await findById<Record<string, unknown>>('listings', id)
    if (!listing) {
      res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
      return
    }
    const recentBids = await findMany<Record<string, unknown>>('bids', {
      where: [{ field: 'listing_id', operator: '=', value: id }],
      orderBy: [{ field: 'amount', direction: 'desc' }],
      limit: 10,
    })
    const normalizedBids = recentBids.map((b) => ({
      ...b,
      amount: typeof b.amount === 'string' ? Number(b.amount) : b.amount,
    }))
    res.json({ ...normalizeListing(listing), recentBids: normalizedBids })
  } catch (error) {
    logger.error('listings.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier listing cap (tiers.ts maxListings) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could list unlimited.
const enforceListingLimit = enforceLimit<AuctionPlatformLimits>({
  limitType: 'maxListings',
  getLimit: (limits) => limits.maxListings,
  getCurrent: async (userId) =>
    count('listings', [{ field: 'seller_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceListingLimit,
  validateBody(createListingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createListingSchema>
      const endTime = new Date(Date.now() + body.duration * 3600 * 1000)
      const startingCents = Math.round(body.startingPrice * 100)
      const result = await create('listings', {
        seller_id: userId,
        title: body.title,
        description: body.description,
        category: body.category,
        starting_price: startingCents,
        reserve_price: body.reservePrice ? Math.round(body.reservePrice * 100) : null,
        buy_now_price: body.buyNowPrice ? Math.round(body.buyNowPrice * 100) : null,
        current_price: startingCents,
        bid_count: 0,
        end_time: endTime.toISOString(),
        status: 'active',
      })
      const created = normalizeListing(result.data as Record<string, unknown>)
      try {
        await index('listings', String(created.id), created)
      } catch (_error) {
        // safe to ignore: search index failures should not block listing creation
      }
      res.status(201).json(created)
    } catch (error) {
      logger.error('listings.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.post('/:id/images', validateBody(imageUploadSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const listing = await findById<Record<string, unknown>>('listings', id)
  if (!listing) {
    res
      .status(404)
      .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    return
  }
  if (listing.seller_id !== userId) {
    res
      .status(403)
      .json({ error: t('listing.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    return
  }

  const decoded = Buffer.from(String(req.body.image).replace(/^data:[^;]+;base64,/, ''), 'base64')
  if (decoded.length < 32) {
    res.status(400).json({
      error: t('listing.imageInvalid', {}, { defaultValue: 'Image data is missing or invalid.' }),
    })
    return
  }
  let fullUrl: string
  let thumbUrl: string
  try {
    const fullImage = await resize(decoded, { width: 800, height: 600, fit: 'contain' })
    const thumbnail = await resize(decoded, { width: 200, height: 150, fit: 'cover' })
    fullUrl = `data:image/jpeg;base64,${Buffer.from(fullImage).toString('base64')}`
    thumbUrl = `data:image/jpeg;base64,${Buffer.from(thumbnail).toString('base64')}`
  } catch (err) {
    logger.error('listings/:id/images resize failed', err)
    res.status(400).json({
      error: t(
        'listing.imageProcessingFailed',
        {},
        {
          defaultValue: 'Could not process image. Try a JPEG/PNG under 10 MB.',
        },
      ),
      detail: err instanceof Error ? err.message : undefined,
    })
    return
  }

  const images = [...((listing.images as string[]) ?? []), fullUrl]
  const thumbnails = [...((listing.thumbnails as string[]) ?? []), thumbUrl]

  const result = await updateById('listings', id, {
    images: JSON.stringify(images),
    thumbnails: JSON.stringify(thumbnails),
  })
  res.json(normalizeListing(result.data as Record<string, unknown>))
})

router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const listing = await findById<Record<string, unknown>>('listings', id)
    if (!listing) {
      res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
      return
    }
    if (listing.seller_id !== userId) {
      res
        .status(403)
        .json({ error: t('listing.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    if (listing.status !== 'active') {
      res
        .status(400)
        .json({ error: t('listing.notActive', {}, { defaultValue: 'Listing is not active' }) })
      return
    }
    const hasBids = Number(listing.bid_count ?? 0) > 0
    // Enforce the reserve: a listing only SELLS when the top bid meets the seller's reserve_price
    // (reserve_price/current_price are cents; a null/0 reserve means "no reserve"). Below reserve,
    // the auction ends unsold as `reserve_not_met` — no won order, no winner notification, and it
    // is not counted as a sale. This was ignored, so items settled sold for any bid below reserve.
    const reserve = Number(listing.reserve_price ?? 0)
    const reserveMet = reserve <= 0 || Number(listing.current_price ?? 0) >= reserve
    const sold = hasBids && reserveMet
    const newStatus = sold ? 'sold' : hasBids ? 'reserve_not_met' : 'cancelled'
    const result = await updateById('listings', id, {
      status: newStatus,
      ended_at: new Date().toISOString(),
    })
    if (sold && listing.highest_bidder_id) {
      const winnerId = listing.highest_bidder_id as string
      const sellerId = listing.seller_id as string
      const finalAmount = Number(listing.current_price ?? 0)
      await ensureWonOrder({
        listingId: id,
        buyerId: winnerId,
        sellerId,
        amount: finalAmount,
      })
      await notifyUser({ userId: winnerId, type: 'won', entityId: id })
      await notifyUser({ userId: sellerId, type: 'sold', entityId: id })
    }
    try {
      await deleteDocument('listings', id)
    } catch (err) {
      logger.error('listings end: search delete failed (non-fatal)', err)
    }
    res.json(normalizeListing(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('listings end failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Test-only fast-end: mark the listing as sold immediately for the
 * highest bidder, regardless of who calls (within reason). Used by E2E
 * to short-circuit the cron-driven end-of-auction without needing to
 * sleep through the listing's natural duration.
 */
router.post('/:id/end-now', async (req: Request, res: Response) => {
  // Fail CLOSED: this test seam force-ends any auction (sells to the top bidder)
  // regardless of caller, so it must be off by default. Gating on NODE_ENV was
  // fail-OPEN (scaffold ships NODE_ENV=development → live auction manipulation).
  // [P5TPL-1/RVALL]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const listing = await findById<Record<string, unknown>>('listings', id)
    if (!listing) {
      res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
      return
    }
    if (listing.seller_id !== userId && listing.highest_bidder_id !== userId) {
      res
        .status(403)
        .json({ error: t('listing.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const hasBids = Number(listing.bid_count ?? 0) > 0
    // Same reserve enforcement as POST /:id/end (see there): only settle as sold when the top bid
    // meets the reserve; otherwise end unsold as reserve_not_met with no won order / winner notice.
    const reserve = Number(listing.reserve_price ?? 0)
    const reserveMet = reserve <= 0 || Number(listing.current_price ?? 0) >= reserve
    const sold = hasBids && reserveMet
    const newStatus = sold ? 'sold' : hasBids ? 'reserve_not_met' : 'cancelled'
    const result = await updateById('listings', id, {
      status: newStatus,
      ended_at: new Date().toISOString(),
    })
    if (sold && listing.highest_bidder_id) {
      const winnerId = listing.highest_bidder_id as string
      const sellerId = listing.seller_id as string
      await ensureWonOrder({
        listingId: id,
        buyerId: winnerId,
        sellerId,
        amount: Number(listing.current_price ?? 0),
      })
      await notifyUser({ userId: winnerId, type: 'won', entityId: id })
      await notifyUser({ userId: sellerId, type: 'sold', entityId: id })
    }
    res.json(normalizeListing(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('listings end-now failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const listing = await findById<Record<string, unknown>>('listings', id)
    if (!listing) {
      res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
      return
    }
    if (listing.seller_id !== userId) {
      res
        .status(403)
        .json({ error: t('listing.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    if ((listing.bid_count as number) > 0) {
      res.status(400).json({
        error: t(
          'listing.notActive',
          {},
          { defaultValue: 'Listing has bids and cannot be deleted' },
        ),
      })
      return
    }
    await deleteById('listings', id)
    try {
      await deleteDocument('listings', id)
    } catch (_error) {
      // safe to ignore: index pruning failures should not block deletion
    }
    res.status(204).end()
  } catch (error) {
    logger.error('listings.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
