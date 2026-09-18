/**
 * My-bids endpoint — denormalised view of the bids the current user has placed
 * with the parent listing inlined so the UI can render the "My bids" page in
 * one round-trip.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface BidRow {
  id: string
  listing_id: string
  bidder_id: string
  amount: number
  created_at: string
}

interface ListingRow {
  id: string
  title: string
  category: string
  current_price: number
  bid_count: number
  end_time: string
  ended_at?: string | null
  status: string
  highest_bidder_id?: string | null
}

function inferBidStatus(
  listing: ListingRow,
  userId: string,
): 'winning' | 'outbid' | 'won' | 'lost' {
  const ended = listing.status !== 'active' || new Date(listing.end_time) <= new Date()
  if (!ended) {
    return listing.highest_bidder_id === userId ? 'winning' : 'outbid'
  }
  return listing.highest_bidder_id === userId ? 'won' : 'lost'
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const bids = await findMany<BidRow>('bids', {
      where: [{ field: 'bidder_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    const seen = new Set<string>()
    const unique: BidRow[] = []
    for (const bid of bids) {
      if (seen.has(bid.listing_id)) continue
      seen.add(bid.listing_id)
      unique.push(bid)
    }
    const items = await Promise.all(
      unique.map(async (bid) => {
        const listing = await findById<ListingRow>('listings', bid.listing_id)
        if (!listing) return null
        return {
          id: bid.id,
          auction_id: listing.id,
          title: listing.title,
          category: listing.category,
          my_bid_cents: Number(bid.amount),
          current_bid_cents: Number(listing.current_price ?? 0),
          bid_count: Number(listing.bid_count ?? 0),
          ends_at: listing.end_time,
          status: inferBidStatus(listing, userId),
        }
      }),
    )
    res.json({ data: items.filter((row): row is NonNullable<typeof row> => row !== null) })
  } catch (error) {
    logger.error('my-bids.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
