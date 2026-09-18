/**
 * Public seller-profile endpoint — returns the public-facing seller summary
 * (handle, name, active listings) keyed by `username`. Used by the frontend
 * SellerProfile page; no authentication required.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface UserRow {
  id: string
  username: string | null
  name: string | null
  createdAt: string
}

interface ListingRow {
  id: string
  seller_id: string
  title: string
  category: string
  current_price: number
  bid_count: number
  end_time: string
  status: string
}

interface SellerReviewRow {
  id: string
  seller_id: string
  reviewer_id: string
  rating: number
  body: string
  created_at: string
}

router.get('/:handle', async (req: Request, res: Response) => {
  try {
    const handle = req.params.handle
    const handleString = Array.isArray(handle) ? handle[0] : handle
    let user: UserRow | undefined
    // Look up first by username (preferred public handle)
    const byUsername = await findMany<UserRow>('users', {
      where: [{ field: 'username', operator: '=', value: handleString }],
      limit: 1,
    })
    user = byUsername[0]
    // Fall back to id, so AuctionDetail's id-based seller links still resolve
    // for users that haven't picked a username yet.
    if (!user && /^[0-9a-fA-F-]{36}$/.test(handleString)) {
      const byId = await findMany<UserRow>('users', {
        where: [{ field: 'id', operator: '=', value: handleString }],
        limit: 1,
      })
      user = byId[0]
    }
    if (!user) {
      res
        .status(404)
        .json({ error: t('seller.notFound', {}, { defaultValue: 'Seller not found' }) })
      return
    }
    const activeRows = await findMany<ListingRow>('listings', {
      where: [
        { field: 'seller_id', operator: '=', value: user.id },
        { field: 'status', operator: '=', value: 'active' },
      ],
      orderBy: [{ field: 'end_time', direction: 'asc' }],
      limit: 12,
    })
    const totalSold = await findMany<ListingRow>('listings', {
      where: [
        { field: 'seller_id', operator: '=', value: user.id },
        { field: 'status', operator: '=', value: 'sold' },
      ],
      limit: 1000,
    }).catch(() => [] as ListingRow[])
    const reviewRows = await findMany<SellerReviewRow>('seller_reviews', {
      where: [{ field: 'seller_id', operator: '=', value: user.id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    }).catch(() => [] as SellerReviewRow[])
    const reviewerIds = Array.from(new Set(reviewRows.map((r) => r.reviewer_id)))
    const reviewers = reviewerIds.length
      ? await findMany<{ id: string; name: string | null; username: string | null }>('users', {
          where: [{ field: 'id', operator: 'in', value: reviewerIds }],
          limit: reviewerIds.length,
        }).catch(() => [])
      : []
    const reviewerNameById = new Map(reviewers.map((u) => [u.id, u.name ?? u.username ?? 'Bidder']))
    const ratings = reviewRows.map((r) => Number(r.rating))
    const ratingAvg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
    const positivePct =
      ratings.length > 0
        ? Math.round((ratings.filter((r) => r >= 4).length / ratings.length) * 100)
        : 0
    res.json({
      handle: user.username ?? user.id,
      name: user.name ?? user.username ?? 'Seller',
      bio: '',
      verified: ratings.length >= 5 && ratingAvg >= 4.5,
      rating: ratingAvg,
      positive_pct: positivePct,
      review_count: reviewRows.length,
      total_sales: totalSold.length,
      member_since: user.createdAt,
      badges: [],
      active_listings: activeRows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        lot: `Lot #${String(row.id).slice(0, 4).toUpperCase()}`,
        current_bid_cents: Number(row.current_price ?? 0),
        bid_count: Number(row.bid_count ?? 0),
        ends_at: row.end_time,
        status: row.status === 'active' ? 'live' : 'closed',
      })),
      reviews: reviewRows.map((r) => ({
        id: r.id,
        bidder: reviewerNameById.get(r.reviewer_id) ?? 'Bidder',
        stars: Number(r.rating),
        body: r.body,
        when: r.created_at,
      })),
    })
  } catch (error) {
    logger.error('sellers.profile', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
