import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

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
    logger.error('ensureWonOrder failed', err)
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
    logger.error('notifyUser failed', err)
  }
}

const router = Router()

const NUMERIC_BID_FIELDS = ['amount'] as const

function normalizeBid<T extends Record<string, unknown> | null>(row: T): T {
  if (!row) return row
  const out: Record<string, unknown> = { ...row }
  for (const f of NUMERIC_BID_FIELDS) {
    const v = out[f]
    if (v === null || v === undefined) continue
    if (typeof v === 'string') out[f] = Number(v)
  }
  return out as T
}

function normalizeBids<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => normalizeBid(r))
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const placeBidSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().positive(),
})

const buyNowSchema = z.object({
  listingId: z.string().min(1),
  paymentMethodId: z.string().optional(),
})

router.get(
  '/listing/:listingId',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
      const bids = await findMany('bids', {
        where: [{ field: 'listing_id', operator: '=', value: req.params.listingId }],
        orderBy: [{ field: 'amount', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      })
      res.json({ data: normalizeBids(bids as Record<string, unknown>[]) })
    } catch (error) {
      logger.error('bids.listByListing', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/mine', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const bids = await findMany('bids', {
      where: [{ field: 'bidder_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: normalizeBids(bids as Record<string, unknown>[]) })
  } catch (error) {
    logger.error('bids.listByUser', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier bid cap (tiers.ts maxBids) — defined + shown on Pricing (CATALOG claims it
// gated) but the create route never enforced it, so any tier could place unlimited bids.
const enforceBidLimit = enforceLimit<AuctionPlatformLimits>({
  limitType: 'maxBids',
  getLimit: (limits) => limits.maxBids,
  getCurrent: async (userId) =>
    count('bids', [{ field: 'bidder_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceBidLimit,
  validateBody(placeBidSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { listingId, amount } = req.body as z.infer<typeof placeBidSchema>

      const listing = await findById<Record<string, unknown>>('listings', listingId)
      if (!listing || listing.status !== 'active') {
        res.status(404).json({
          error: t('listing.notFound', {}, { defaultValue: 'Listing not found or ended' }),
        })
        return
      }

      if (listing.seller_id === userId) {
        res.status(400).json({
          error: t('bid.ownListing', {}, { defaultValue: 'Cannot bid on your own listing' }),
        })
        return
      }

      const endTime = new Date(listing.end_time as string)
      if (endTime <= new Date()) {
        res
          .status(400)
          .json({ error: t('bid.auctionEnded', {}, { defaultValue: 'Auction has ended' }) })
        return
      }

      const bidAmount = Math.round(amount * 100)
      const currentPrice = Number(listing.current_price ?? 0)
      const incrementPercent = Number(process.env.BID_INCREMENT_PERCENT ?? '0.05')
      const minBid = Math.round(currentPrice * (1 + incrementPercent))

      if (bidAmount < minBid) {
        res.status(400).json({
          error: t('bid.tooLow', {}, { defaultValue: 'Bid must be higher than minimum increment' }),
          minBid: minBid / 100,
        })
        return
      }

      const result = await create('bids', {
        listing_id: listingId,
        bidder_id: userId,
        amount: bidAmount,
      })
      const bid = result.data as Record<string, unknown>

      const newBidCount = Number(listing.bid_count ?? 0) + 1
      const updates: Record<string, unknown> = {
        current_price: bidAmount,
        bid_count: newBidCount,
        highest_bidder_id: userId,
      }

      const autoExtendMinutes = Number(process.env.AUTO_EXTEND_MINUTES ?? '5')
      const timeRemaining = endTime.getTime() - Date.now()
      if (timeRemaining < autoExtendMinutes * 60 * 1000) {
        updates.end_time = new Date(Date.now() + autoExtendMinutes * 60 * 1000).toISOString()
      }

      await updateById('listings', listingId, updates)

      // realtime-public: auction listings + live bids are PUBLIC — GET /listings/:id is
      // unauthenticated and returns the listing plus recent bids to anyone, so the
      // `listing:<id>` room deliberately has NO onJoinRequest guard (public bid-watching
      // is a core feature). The payloads carry only public bid data (amount, count, buyer).
      try {
        broadcast(`listing:${listingId}`, 'new_bid', {
          bidId: bid.id,
          amount: bidAmount,
          bidCount: newBidCount,
          endTime: updates.end_time ?? listing.end_time,
        })
      } catch (_error) {
        // safe to ignore: realtime broadcast failures should not block the bid response
      }

      if (listing.highest_bidder_id && listing.highest_bidder_id !== userId) {
        const previousBidderId = listing.highest_bidder_id as string
        await notifyUser({
          userId: previousBidderId,
          type: 'outbid',
          entityId: listingId,
        })
        try {
          if (await notificationEnabled(previousBidderId, 'outbid')) {
            const prevBidder = await findById<Record<string, unknown>>('users', previousBidderId)
            if (prevBidder?.email) {
              await sendMail({
                from:
                  process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
                to: String(prevBidder.email),
                subject: t('bid.outbidSubject', {}, { defaultValue: 'You have been outbid' }),
                text: t(
                  'bid.outbidBody',
                  { title: String(listing.title ?? ''), amount: String(bidAmount / 100) },
                  {
                    defaultValue: `You have been outbid on "${String(
                      listing.title ?? '',
                    )}". The new high bid is $${(bidAmount / 100).toFixed(2)}.`,
                  },
                ),
              })
            }
          }
        } catch (err) {
          logger.error('outbid email failed (non-fatal)', err)
        }
      }

      res.status(201).json(normalizeBid(bid))
    } catch (error) {
      logger.error('bids.place', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.post('/buy-now', validateBody(buyNowSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { listingId } = req.body as z.infer<typeof buyNowSchema>

    const listing = await findById<Record<string, unknown>>('listings', listingId)
    if (!listing || listing.status !== 'active') {
      res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found or ended' }) })
      return
    }

    if (!listing.buy_now_price) {
      res.status(400).json({
        error: t('bid.noBuyNow', {}, { defaultValue: 'Buy Now not available for this listing' }),
      })
      return
    }

    if (listing.seller_id === userId) {
      res
        .status(400)
        .json({ error: t('bid.ownListing', {}, { defaultValue: 'Cannot buy your own listing' }) })
      return
    }

    await updateById('listings', listingId, {
      status: 'sold',
      current_price: listing.buy_now_price,
      highest_bidder_id: userId,
      ended_at: new Date().toISOString(),
    })

    await ensureWonOrder({
      listingId,
      buyerId: userId,
      sellerId: listing.seller_id as string,
      amount: Number(listing.buy_now_price),
    })
    await notifyUser({ userId, type: 'won', entityId: listingId })
    await notifyUser({ userId: listing.seller_id as string, type: 'sold', entityId: listingId })

    try {
      broadcast(`listing:${listingId}`, 'sold', {
        buyerId: userId,
        price: listing.buy_now_price,
      })
    } catch (err) {
      logger.error('buy-now broadcast failed (non-fatal)', err)
    }

    res.json({ message: t('bid.buyNowSuccess', {}, { defaultValue: 'Purchase successful' }) })
  } catch (error) {
    logger.error('bids.buyNow', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
