/**
 * Shows handler — owner (author) writes; world-readable.
 *
 * Authorization: every by-id mutation checks `show.author_id === userId`
 * before proceeding. Reads are public (per INVENTORY.md).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { index as indexDoc, search } from '@molecule/api-search'

import type { PodcastLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createShowSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  category: z.string().optional().default('general'),
  language: z.string().optional().default('en'),
  cover_image_url: z.string().optional().default(''),
})

const updateShowSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  cover_image_url: z.string().optional(),
})

const coverImageSchema = z.object({
  cover_image_url: z.string().min(1),
})

/**
 * Best-effort search-index update. Indexing is a downstream concern —
 * if Meilisearch is down or running with placeholder credentials it must
 * not break show writes (the database is the source of truth).
 */
async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await indexDoc('shows', id, doc)
  } catch (_error) {
    // Swallow — indexing failures shouldn't surface as 500s; DB is source of truth
  }
}

/**
 * Static publisher/category metadata for the seeded catalog. Keeping a
 * lookup table here (rather than another DB column) keeps the schema
 * lean while still letting the Discover grid render the publisher line
 * the design calls for. New shows created via POST inherit a fallback
 * publisher derived from their title.
 *
 * IDs match those produced by `_seed.ts`; any unknown id falls back to
 * a deterministic synthetic publisher so author-created shows still
 * show something coherent in the UI.
 */
const SEEDED_PUBLISHERS: Record<string, string> = {
  '00000000-0000-4000-a000-000000000001': 'Cortex Media',
  '00000000-0000-4000-a000-000000000002': 'Newsroom Lab',
  '00000000-0000-4000-a000-000000000003': 'Wedge Capital',
  '00000000-0000-4000-a000-000000000004': 'Two Mics Studio',
  '00000000-0000-4000-a000-000000000005': 'Sea Salt Audio',
  '00000000-0000-4000-a000-000000000006': 'Polyphase',
  '00000000-0000-4000-a000-000000000007': 'Quiet Hours Media',
  '00000000-0000-4000-a000-000000000008': 'Marginalia Audio',
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/**
 * Decorate a show row with the fields the listener UI expects but the
 * raw DB row doesn't carry:
 *
 *   - `cover_index`     deterministic 0..11 (gradient cover when image missing)
 *   - `publisher`       static lookup or synthetic fallback
 *   - `episodes_count`  alias of episode_count (frontend uses plural)
 *   - `unplayed_count`  episode_count minus completed episodes for `userId`
 *   - `subscribed`      true iff `userId` has a row in subscriptions
 *   - `featured`        deterministic banner pick (~half the catalog)
 *   - `trending`        deterministic mid-row pick (different bucket)
 *   - `rating`          deterministic 4.0..5.0 (presentation only)
 *
 * `subscribed` and `unplayed_count` are computed against pre-fetched
 * Sets so callers can list-decorate without N+1 queries.
 */
function decorateShow(
  show: Record<string, unknown>,
  ctx: {
    subscribedShowIds?: Set<string>
    completedByShowId?: Map<string, number>
  } = {},
): Record<string, unknown> {
  const sid = String(show.id ?? '')
  const h = hashStr(sid)
  const episodeCount = Number(show.episode_count ?? 0) || 0
  const completed = ctx.completedByShowId?.get(sid) ?? 0
  const subscribed = ctx.subscribedShowIds?.has(sid) ?? false
  const fallbackPublisher = (() => {
    const title = String(show.title ?? '').trim()
    if (!title) return 'Independent'
    return `${title.split(/\s+/)[0]} Studios`
  })()
  return {
    ...show,
    cover_index: h % 12,
    publisher: SEEDED_PUBLISHERS[sid] ?? fallbackPublisher,
    episodes_count: episodeCount,
    unplayed_count: Math.max(0, episodeCount - completed),
    subscribed,
    featured: h % 2 === 0,
    trending: h % 3 === 0,
    rating: Number((4 + (h % 100) / 100).toFixed(2)),
  }
}

/**
 * Build the per-user context used by `decorateShow` for a list. Single
 * round-trip per table; keeps the GET /api/shows handler O(1) DB calls
 * regardless of catalog size.
 */
async function buildDecorationContext(userId: string | null): Promise<{
  subscribedShowIds: Set<string>
  completedByShowId: Map<string, number>
}> {
  if (!userId) {
    return { subscribedShowIds: new Set(), completedByShowId: new Map() }
  }
  const subs = await findMany<Record<string, unknown>>('subscriptions', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  }).catch(() => [])
  const subscribedShowIds = new Set(subs.map((s) => String(s.show_id)))

  const progress = await findMany<Record<string, unknown>>('listening_progress', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  }).catch(() => [])
  const completedEpisodeIds = progress
    .filter((p) => p.completed_at)
    .map((p) => String(p.episode_id))
  const completedByShowId = new Map<string, number>()
  if (completedEpisodeIds.length) {
    const eps = await findMany<Record<string, unknown>>('episodes', {
      where: [{ field: 'id', operator: 'in', value: completedEpisodeIds }],
    }).catch(() => [])
    for (const ep of eps) {
      const sid = String(ep.show_id)
      completedByShowId.set(sid, (completedByShowId.get(sid) ?? 0) + 1)
    }
  }
  return { subscribedShowIds, completedByShowId }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, category } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (category) where.push({ field: 'category', operator: '=', value: category })

    const userId = getUserId(res)
    const ctx = await buildDecorationContext(userId)

    const shows = await findMany<Record<string, unknown>>('shows', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(shows.map((s) => decorateShow(s, ctx)))
  } catch (error) {
    logger.error('shows.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    try {
      const results = await search('shows', { text: q, page, perPage: limit })
      res.json(results)
      return
    } catch (_error) {
      // Fall back to direct DB search when meilisearch is unavailable
    }
    const dbHits = await findMany('shows', {
      where: [{ field: 'title', operator: 'ilike', value: q }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ hits: dbHits })
  } catch (error) {
    logger.error('shows.search', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/mine', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const shows = await findMany('shows', {
      where: [{ field: 'author_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(shows)
  } catch (error) {
    logger.error('shows.mine', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const show = await findById<Record<string, unknown>>('shows', idOf(req))
    if (!show) {
      res
        .status(404)
        .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
      return
    }
    const userId = getUserId(res)
    const ctx = await buildDecorationContext(userId)
    res.json(decorateShow(show, ctx))
  } catch (error) {
    logger.error('shows.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<PodcastLimits>({
    limitType: 'maxShows',
    getLimit: (limits) => limits.maxShows,
    getCurrent: async (userId) =>
      count('shows', [{ field: 'author_id', operator: '=', value: userId }]),
  }) as never,
  validateBody(createShowSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const { title, description, category, language, cover_image_url } = req.body as z.infer<
        typeof createShowSchema
      >

      const result = await create('shows', {
        title,
        description,
        category,
        language,
        cover_image_url: cover_image_url || null,
        author_id: userId,
        user_id: userId,
        episode_count: 0,
        subscriber_count: 0,
        is_explicit: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const show = (result.data ?? result) as Record<string, unknown>
      if (show && show.id) await tryIndex(String(show.id), show)
      res.status(201).json(show)
    } catch (error) {
      logger.error('shows.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateShowSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('shows', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }
      // requireOwner — only the show author may edit.
      if (existing.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }

      const result = await updateById('shows', idOf(req), {
        ...req.body,
        updated_at: new Date(),
      })
      const updated = (result.data ?? result) as Record<string, unknown>
      if (updated && updated.id) await tryIndex(String(updated.id), updated)
      res.json(updated)
    } catch (error) {
      logger.error('shows.update', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/cover',
  validateParams(idParamSchema),
  validateBody(coverImageSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const show = await findById<Record<string, unknown>>('shows', idOf(req))
      if (!show) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }
      if (show.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }

      const { cover_image_url } = req.body as z.infer<typeof coverImageSchema>
      const result = await updateById('shows', idOf(req), {
        cover_image_url,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('shows.cover', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('shows', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
      return
    }
    if (existing.author_id !== userId) {
      res
        .status(403)
        .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
      return
    }
    await deleteById('shows', idOf(req))
    res.status(204).end()
  } catch (error) {
    logger.error('shows.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
