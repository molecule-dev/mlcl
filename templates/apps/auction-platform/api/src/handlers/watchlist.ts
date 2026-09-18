import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { AuctionPlatformLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const addToWatchlistSchema = z.object({
  listingId: z.string().min(1),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const watchlist = await findMany<Record<string, unknown>>('watchlist', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })

    const hydrated = await Promise.all(
      watchlist.map(async (item) => {
        const listing = await findById('listings', item.listing_id as string)
        return { ...item, listing }
      }),
    )

    res.json({ data: hydrated })
  } catch (error) {
    logger.error('watchlist.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier watchlist cap (tiers.ts maxWatchlist) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route only had a dup-guard, so any tier could watch unlimited.
const enforceWatchlistLimit = enforceLimit<AuctionPlatformLimits>({
  limitType: 'maxWatchlist',
  getLimit: (limits) => limits.maxWatchlist,
  getCurrent: async (userId) =>
    count('watchlist', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceWatchlistLimit,
  validateBody(addToWatchlistSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { listingId } = req.body as z.infer<typeof addToWatchlistSchema>

      const existing = await findMany<Record<string, unknown>>('watchlist', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'listing_id', operator: '=', value: listingId },
        ],
        limit: 1,
      })

      if (existing.length > 0) {
        res.status(409).json({
          error: t('watchlistApi.alreadyAdded', {}, { defaultValue: 'Already in watchlist' }),
        })
        return
      }

      const result = await create('watchlist', {
        user_id: userId,
        listing_id: listingId,
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('watchlist.add', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:listingId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = await findMany<Record<string, unknown>>('watchlist', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'listing_id', operator: '=', value: req.params.listingId },
      ],
      limit: 1,
    })

    if (existing.length === 0) {
      res
        .status(404)
        .json({ error: t('watchlistApi.notFound', {}, { defaultValue: 'Not in watchlist' }) })
      return
    }

    await deleteById('watchlist', existing[0].id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('watchlist.remove', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
