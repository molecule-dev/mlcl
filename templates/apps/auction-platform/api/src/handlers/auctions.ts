/**
 * Auctions endpoint — frontend-facing alias of the listings table that returns
 * a denormalised, UI-ready row shape. Splits "browse list" from raw listing
 * documents so the React side can hold a stable contract while the underlying
 * `listings` table evolves.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  category: z.string().optional(),
})

interface ListingRow {
  id: string
  title: string
  category: string
  current_price: number
  bid_count: number
  end_time: string
  status: string
  thumbnails?: string[]
  images?: string[]
  reserve_price?: number | null
}

function inferUiStatus(row: ListingRow): 'live' | 'ending' | 'closed' | 'reserve_not_met' {
  // An auction that ended below its reserve is stored as 'reserve_not_met' — surface it as such
  // (it's an unsold end-state), rather than collapsing every non-active listing to 'closed'.
  if (row.status === 'reserve_not_met') return 'reserve_not_met'
  if (row.status !== 'active') return 'closed'
  const end = new Date(row.end_time).getTime()
  const remaining = end - Date.now()
  if (remaining < 0) return 'closed'
  if (remaining < 1000 * 60 * 30) return 'ending'
  if (row.reserve_price && row.current_price < row.reserve_price) return 'reserve_not_met'
  return 'live'
}

function toListItem(row: ListingRow): Record<string, unknown> {
  const thumb =
    Array.isArray(row.thumbnails) && row.thumbnails.length > 0 ? row.thumbnails[0] : null
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    lot: `Lot #${String(row.id).slice(0, 4).toUpperCase()}`,
    current_bid_cents: Number(row.current_price ?? 0),
    bid_count: Number(row.bid_count ?? 0),
    ends_at: row.end_time,
    status: inferUiStatus(row),
    image_url: thumb,
    image_alt: row.title,
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, category } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'status', operator: '=', value: 'active' },
    ]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    const rows = await findMany<ListingRow>('listings', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'end_time', direction: 'asc' }],
    })
    res.json({ data: rows.map(toListItem) })
  } catch (error) {
    logger.error('auctions.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const listingId = Array.isArray(id) ? id[0] : id
    const listing = await findById<Record<string, unknown>>('listings', listingId)
    if (!listing) {
      res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
      return
    }
    const row = listing as unknown as ListingRow & {
      description?: string
      seller_id?: string
      reserve_price?: number | null
      buy_now_price?: number | null
    }
    const recentBids = await findMany<{
      id: string
      bidder_id: string
      amount: number
      created_at: string
    }>('bids', {
      where: [{ field: 'listing_id', operator: '=', value: listingId }],
      orderBy: [{ field: 'amount', direction: 'desc' }],
      limit: 10,
    })
    const sessionUserId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    const seller = row.seller_id
      ? await findById<{ id: string; username?: string; name?: string }>('users', row.seller_id)
      : null
    let isWatched = false
    if (sessionUserId) {
      const existing = await findMany<{ id: string }>('watchlist', {
        where: [
          { field: 'user_id', operator: '=', value: sessionUserId },
          { field: 'listing_id', operator: '=', value: listingId },
        ],
        limit: 1,
      })
      isWatched = existing.length > 0
    }
    const data = {
      id: row.id,
      title: row.title,
      lot: `Lot #${String(row.id).slice(0, 4).toUpperCase()}`,
      category: row.category,
      description: (row as { description?: string }).description ?? '',
      seller: {
        handle: seller?.username ?? seller?.id ?? 'seller',
        name: seller?.name ?? seller?.username ?? 'Seller',
        rating: 0,
        sales: 0,
      },
      current_bid_cents: Number(row.current_price ?? 0),
      bid_count: Number(row.bid_count ?? 0),
      bid_increment_cents: Math.max(100, Math.round(Number(row.current_price ?? 0) * 0.05)),
      buy_now_cents: row.buy_now_price ?? null,
      ends_at: row.end_time,
      status: inferUiStatus(row),
      images: Array.isArray((row as { images?: string[] }).images)
        ? (row as { images: string[] }).images.map((u) => ({ url: u, alt: row.title }))
        : [],
      bid_history: recentBids.map((b) => ({
        id: b.id,
        bidder: b.bidder_id === sessionUserId ? 'you' : `bidder_${String(b.bidder_id).slice(0, 4)}`,
        amount_cents: Number(b.amount),
        placed_at: b.created_at,
        you: b.bidder_id === sessionUserId,
      })),
      shipping_from: '—',
      return_window_days: 14,
      reserve_met:
        !row.reserve_price || Number(row.current_price ?? 0) >= Number(row.reserve_price),
      is_watched: isWatched,
    }
    res.json(data)
  } catch (error) {
    logger.error('auctions.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
