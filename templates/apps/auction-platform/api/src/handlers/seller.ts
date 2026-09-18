/**
 * Seller-hub endpoints — read-only summary of the current user's seller
 * activity (stats / listings / activity feed). The frontend dashboard hits
 * three lightweight endpoints in parallel; this file groups them so the
 * routing surface stays cohesive.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface ListingRow {
  id: string
  seller_id: string
  title: string
  category: string
  current_price: number
  bid_count: number
  end_time: string
  ended_at?: string | null
  status: string
}

interface BidRow {
  id: string
  listing_id: string
  bidder_id: string
  amount: number
  created_at: string
}

function inferUiStatus(
  row: ListingRow,
): 'live' | 'ending' | 'closed' | 'reserve_not_met' | 'draft' {
  if (row.status === 'draft') return 'draft'
  if (row.status === 'reserve_not_met') return 'reserve_not_met'
  if (row.status !== 'active') return 'closed'
  const remaining = new Date(row.end_time).getTime() - Date.now()
  if (remaining < 0) return 'closed'
  if (remaining < 1000 * 60 * 30) return 'ending'
  return 'live'
}

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const all = await findMany<ListingRow>('listings', {
      where: [{ field: 'seller_id', operator: '=', value: userId }],
      limit: 500,
    })
    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30
    const active = all.filter((row) => row.status === 'active')
    const endedRecent = all.filter(
      (row) =>
        row.status !== 'active' &&
        new Date(row.ended_at ?? row.end_time).getTime() >= thirtyDaysAgo,
    )
    const totalBids30d = active.reduce((sum, row) => sum + Number(row.bid_count ?? 0), 0)
    // Sold = settled at/above reserve (status 'sold'), NOT merely "had a bid" — a reserve_not_met
    // listing also has bid_count > 0 but was not sold, so counting bids would inflate sales/revenue.
    const itemsSold30d = endedRecent.filter((row) => row.status === 'sold').length
    const revenue = endedRecent.reduce(
      (sum, row) => (row.status === 'sold' ? sum + Number(row.current_price ?? 0) : sum),
      0,
    )
    res.json({
      active_listings: active.length,
      total_bids_30d: totalBids30d,
      items_sold_30d: itemsSold30d,
      revenue_30d_cents: revenue,
    })
  } catch (error) {
    logger.error('seller.stats', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/listings', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = await findMany<ListingRow>('listings', {
      where: [{ field: 'seller_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    const listingIds = rows.map((row) => row.id)
    let watcherCounts = new Map<string, number>()
    if (listingIds.length > 0) {
      const watchers = await findMany<{ listing_id: string }>('watchlist', {
        where: [{ field: 'listing_id', operator: 'in', value: listingIds }],
        limit: 5000,
      }).catch(() => [] as Array<{ listing_id: string }>)
      watcherCounts = watchers.reduce<Map<string, number>>((acc, w) => {
        acc.set(w.listing_id, (acc.get(w.listing_id) ?? 0) + 1)
        return acc
      }, new Map<string, number>())
    }
    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      current_bid_cents: Number(row.current_price ?? 0),
      bid_count: Number(row.bid_count ?? 0),
      watchers: watcherCounts.get(row.id) ?? 0,
      ends_at: row.end_time,
      status: inferUiStatus(row),
    }))
    res.json({ data })
  } catch (error) {
    logger.error('seller.listings', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/activity', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const ownListings = await findMany<ListingRow>('listings', {
      where: [{ field: 'seller_id', operator: '=', value: userId }],
      limit: 50,
    })
    const listingIds = ownListings.map((row) => row.id)
    const items: Array<{
      id: string
      kind: 'new_bid' | 'sold' | 'watchlist' | 'system'
      title: string
      body: string
      when: string
      to?: string
    }> = []
    if (listingIds.length > 0) {
      const recentBids = await findMany<BidRow>('bids', {
        where: [{ field: 'listing_id', operator: 'in', value: listingIds }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 20,
      }).catch(() => [] as BidRow[])
      for (const bid of recentBids) {
        const parent = ownListings.find((row) => row.id === bid.listing_id)
        if (!parent) continue
        items.push({
          id: `bid:${bid.id}`,
          kind: 'new_bid',
          title: `New bid on ${parent.title}`,
          body: `Bidder placed ${(Number(bid.amount) / 100).toFixed(2)}.`,
          when: bid.created_at,
          to: `/auctions/${parent.id}`,
        })
      }
    }
    for (const row of ownListings) {
      if (row.status !== 'active' && (row.bid_count ?? 0) > 0) {
        items.push({
          id: `sold:${row.id}`,
          kind: 'sold',
          title: `You sold ${row.title}`,
          body: `Final price ${(Number(row.current_price) / 100).toFixed(2)}.`,
          when: row.ended_at ?? row.end_time,
          to: `/auctions/${row.id}`,
        })
      }
    }
    items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    res.json({ data: items.slice(0, 12) })
  } catch (error) {
    logger.error('seller.activity', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
