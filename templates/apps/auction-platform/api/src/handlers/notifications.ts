/**
 * Notifications endpoint — auction-platform synthesises a unified feed of
 * auction events derived from the live `bids`, `listings` and `notifications`
 * tables so the UI has real, server-derived rows on a fresh install.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { findById, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

type FeedKind = 'outbid' | 'ending' | 'won' | 'new_bid' | 'sold' | 'watchlist' | 'system'

interface BidRow {
  id: string
  listing_id: string
  bidder_id: string
  amount: number
  created_at: string
}

interface ListingRow {
  id: string
  seller_id: string
  title: string
  current_price: number
  bid_count: number
  end_time: string
  status: string
  highest_bidder_id?: string | null
}

interface NotificationRow {
  id: string
  user_id: string
  type: string
  entity_id?: string | null
  read_at?: string | null
  created_at: string
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const [stored, ownListings, myBids] = await Promise.all([
      findMany<NotificationRow>('notifications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 50,
      }).catch(() => [] as NotificationRow[]),
      findMany<ListingRow>('listings', {
        where: [{ field: 'seller_id', operator: '=', value: userId }],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
        limit: 25,
      }).catch(() => [] as ListingRow[]),
      findMany<BidRow>('bids', {
        where: [{ field: 'bidder_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 25,
      }).catch(() => [] as BidRow[]),
    ])

    const items: Array<{
      id: string
      kind: FeedKind
      title: string
      body: string
      when: string
      unread?: boolean
      to?: string
    }> = []

    for (const note of stored) {
      const kind = (note.type as FeedKind) || 'system'
      let title = note.type
      let body = ''
      let to: string | undefined
      if (note.entity_id) {
        const listing = await findById<ListingRow>('listings', note.entity_id)
        if (listing) {
          title = listing.title
          to = `/auctions/${listing.id}`
          body = `Listing status: ${listing.status}`
        }
      }
      items.push({
        id: `n:${note.id}`,
        kind,
        title,
        body,
        when: note.created_at,
        unread: !note.read_at,
        to,
      })
    }

    for (const listing of ownListings) {
      if (listing.status === 'ended' || listing.status === 'sold') {
        items.push({
          id: `seller-sold:${listing.id}`,
          kind: 'sold',
          title: listing.title,
          body: `Final price $${(Number(listing.current_price) / 100).toFixed(2)}.`,
          when: listing.end_time,
          to: `/auctions/${listing.id}`,
        })
      } else if (listing.bid_count > 0) {
        items.push({
          id: `seller-bid:${listing.id}`,
          kind: 'new_bid',
          title: `New bids on ${listing.title}`,
          body: `${listing.bid_count} bids · current high $${(Number(listing.current_price) / 100).toFixed(2)}.`,
          when: listing.end_time,
          to: `/auctions/${listing.id}`,
        })
      }
    }

    for (const bid of myBids.slice(0, 10)) {
      const listing = await findById<ListingRow>('listings', bid.listing_id)
      if (!listing) continue
      const ended = listing.status !== 'active' || new Date(listing.end_time) <= new Date()
      const isHighest = listing.highest_bidder_id === userId
      let kind: FeedKind = 'new_bid'
      let title = listing.title
      if (ended) {
        kind = isHighest ? 'won' : 'outbid'
        title = isHighest ? `You won ${listing.title}` : `You did not win ${listing.title}`
      } else if (!isHighest) {
        kind = 'outbid'
        title = `You have been outbid on ${listing.title}`
      } else {
        kind = 'new_bid'
        title = `Your bid is leading on ${listing.title}`
      }
      items.push({
        id: `bid:${bid.id}`,
        kind,
        title,
        body: `Current high bid $${(Number(listing.current_price) / 100).toFixed(2)}.`,
        when: bid.created_at,
        to: `/auctions/${listing.id}`,
      })
    }

    items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    res.json({ data: items })
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date().toISOString() },
    )
    res.json({ ok: true, updated: result.affected ?? 0 })
  } catch (error) {
    logger.error('notifications.markRead', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
