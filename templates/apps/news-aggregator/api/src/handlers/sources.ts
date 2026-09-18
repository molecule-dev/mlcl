/**
 * Source CRUD + per-user follow toggle.
 *
 * Sources may be either global (`user_id IS NULL`, admin-curated, public
 * read) or user-scoped (per-user private feeds). All by-id mutating
 * operations scope by `user_id` so a user can only edit / delete sources
 * they own; global rows are read-only via this handler.
 *
 * The list endpoint returns rows in the polished `Source` shape the
 * frontend expects: `slug`, `factual_rating`, `bias_value`,
 * `story_count`, `following`, `accent_color`, `ownership`.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findOne,
  query,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { NewsAggregatorLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  category: z.string().optional(),
  active: z.coerce.boolean().optional(),
})

const idParamsSchema = z.object({ id: z.string().min(1) })
const slugParamsSchema = z.object({ slug: z.string().min(1) })

const createSourceSchema = z.object({
  name: z.string().min(1).max(200),
  feed_url: z.string().url(),
  website_url: z.string().url().optional().nullable(),
  category_id: z.string().optional().nullable(),
  icon_url: z.string().url().optional().nullable(),
})

const updateSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  feed_url: z.string().url().optional(),
  website_url: z.string().url().optional().nullable(),
  category_id: z.string().optional().nullable(),
  icon_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
})

const getParam = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value)

interface SourceRow {
  id: string
  user_id: string | null
  name: string
  slug: string | null
  description: string | null
  feed_url: string
  website_url: string | null
  category_id: string | null
  icon_url: string | null
  bias_value: string | null
  factual_rating: number
  ownership: string | null
  accent_color: string | null
  is_active: boolean
  story_count: string | number
  following: boolean
  last_fetched_at: string | null
  created_at: string
}

const mapSource = (
  r: SourceRow,
): {
  id: string
  user_id: string | null
  name: string
  slug: string
  description: string | null
  feed_url: string
  website_url: string | null
  category_id: string | null
  icon_url: string | null
  bias_value: number
  factual_rating: number
  ownership: string | null
  accent_color: string | null
  is_active: boolean
  story_count: number
  following: boolean
  last_fetched_at: string | null
  created_at: string
} => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  slug: r.slug ?? r.id,
  description: r.description,
  feed_url: r.feed_url,
  website_url: r.website_url,
  category_id: r.category_id,
  icon_url: r.icon_url,
  bias_value: r.bias_value ? Number(r.bias_value) : 0,
  factual_rating: r.factual_rating,
  ownership: r.ownership,
  accent_color: r.accent_color,
  is_active: r.is_active,
  story_count: Number(r.story_count ?? 0),
  following: r.following === true,
  last_fetched_at: r.last_fetched_at,
  created_at: r.created_at,
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { category, active } = req.query as unknown as z.infer<typeof listQuerySchema>
    const userId = getUserId(res)
    const params: unknown[] = []
    const where: string[] = ['(s.user_id IS NULL']

    if (userId) {
      params.push(userId)
      where[0] += ` OR s.user_id = $${params.length}::uuid)`
    } else {
      where[0] += ')'
    }

    if (category) {
      params.push(category)
      where.push(`s.category_id::text = $${params.length}`)
    }
    if (active !== undefined) {
      params.push(active)
      where.push(`s.is_active = $${params.length}`)
    }

    const followJoin = userId
      ? `LEFT JOIN source_followers sf
           ON sf.source_id = s.id AND sf.user_id = $1::uuid`
      : ''
    const followingSelect = userId ? `(sf.id IS NOT NULL)` : `false`

    const result = await query<SourceRow>(
      `SELECT s.id, s.user_id, s.name, s.slug, s.description, s.feed_url,
              s.website_url, s.category_id, s.icon_url,
              s.bias_value::text AS bias_value, s.factual_rating, s.ownership,
              s.accent_color, s.is_active, s.last_fetched_at, s.created_at,
              (SELECT COUNT(*)::text FROM story_coverage sc WHERE sc.source_id = s.id) AS story_count,
              ${followingSelect} AS following
       FROM sources s
       ${followJoin}
       WHERE ${where.join(' AND ')}
       ORDER BY s.name ASC`,
      params,
    )
    res.json(result.rows.map(mapSource))
  } catch (error) {
    logger.error('sources.list', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

const fetchSourceWithStats = async (
  field: 'id' | 'slug',
  value: string,
  userId: string | null,
): Promise<SourceRow | null> => {
  const params: unknown[] = []
  const followJoin = userId
    ? `LEFT JOIN source_followers sf
         ON sf.source_id = s.id AND sf.user_id = $1::uuid`
    : ''
  const followingSelect = userId ? `(sf.id IS NOT NULL)` : `false`
  if (userId) params.push(userId)
  params.push(value)
  const lookup = field === 'id' ? `s.id::text = $${params.length}` : `s.slug = $${params.length}`
  const result = await query<SourceRow>(
    `SELECT s.id, s.user_id, s.name, s.slug, s.description, s.feed_url,
            s.website_url, s.category_id, s.icon_url,
            s.bias_value::text AS bias_value, s.factual_rating, s.ownership,
            s.accent_color, s.is_active, s.last_fetched_at, s.created_at,
            (SELECT COUNT(*)::text FROM story_coverage sc WHERE sc.source_id = s.id) AS story_count,
            ${followingSelect} AS following
     FROM sources s
     ${followJoin}
     WHERE ${lookup}
     LIMIT 1`,
    params,
  )
  return result.rows[0] ?? null
}

router.get(
  '/by-slug/:slug',
  validateParams(slugParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const slug = getParam(req.params.slug)
      const row = await fetchSourceWithStats('slug', slug, getUserId(res))
      if (!row) {
        res.status(404).json({
          error: t('sources.notFound', undefined, { defaultValue: 'Source not found' }),
        })
        return
      }
      res.json(mapSource(row))
    } catch (error) {
      logger.error('sources.getBySlug', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Per-source follow toggle. Authenticated only. Returns `{ following }`.
 *
 * Uses an explicit toggle SQL with ON CONFLICT so two concurrent POSTs
 * from the same user (e.g. React StrictMode double-firing in dev or a
 * fast double-click) cannot violate the UNIQUE(user_id, source_id) index
 * and 500. The semantics: if a row exists we delete it (unfollow); if
 * not, we INSERT — and the INSERT is ON CONFLICT DO NOTHING so a racing
 * second INSERT just no-ops to the same following=true state.
 */
router.post(
  '/:slug/follow',
  validateParams(slugParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const slug = getParam(req.params.slug)
      const src = await findOne<{ id: string }>('sources', [
        { field: 'slug', operator: '=', value: slug },
      ])
      if (!src) {
        res.status(404).json({
          error: t('sources.notFound', undefined, { defaultValue: 'Source not found' }),
        })
        return
      }
      const deleted = await query<{ id: string }>(
        `DELETE FROM source_followers
         WHERE user_id = $1::uuid AND source_id = $2::uuid
         RETURNING id`,
        [userId, src.id],
      )
      if (deleted.rowCount && deleted.rowCount > 0) {
        res.json({ following: false, slug })
        return
      }
      await query(
        `INSERT INTO source_followers (user_id, source_id, created_at)
         VALUES ($1::uuid, $2::uuid, NOW())
         ON CONFLICT (user_id, source_id) DO NOTHING`,
        [userId, src.id],
      )
      res.json({ following: true, slug })
    } catch (error) {
      logger.error('sources.follow', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Stories that a given source has covered. Returns the polished `Story`
 * shape so the frontend can render the source-detail recent-stories list
 * with the same `StoryListItem` component used elsewhere.
 */
router.get(
  '/:slug/stories',
  validateParams(slugParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const slug = getParam(req.params.slug)
      const src = await findOne<{ id: string }>('sources', [
        { field: 'slug', operator: '=', value: slug },
      ])
      if (!src) {
        res.json([])
        return
      }
      const result = await query<{
        id: string
        headline: string
        excerpt: string | null
        body: string | null
        topic: string
        topic_slug: string
        source_count: number
        average_bias: string | null
        image_url: string | null
        published_at: string
      }>(
        `SELECT a.id, a.title AS headline, a.excerpt, a.content AS body,
                c.name AS topic, c.slug AS topic_slug,
                a.source_count, a.bias_score::text AS average_bias,
                a.image_url, COALESCE(cov.published_at, a.published_at) AS published_at
         FROM articles a
         JOIN news_categories c ON c.id = a.category_id
         JOIN story_coverage cov ON cov.article_id = a.id
         WHERE cov.source_id = $1
         ORDER BY COALESCE(cov.published_at, a.published_at) DESC
         LIMIT 50`,
        [src.id],
      )
      res.json(
        result.rows.map((r) => ({
          ...r,
          average_bias: r.average_bias ? Number(r.average_bias) : 0,
        })),
      )
    } catch (error) {
      logger.error('sources.stories', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)
    // Allow either a UUID or a slug-style identifier here so the
    // legacy /api/sources/:id contract still works for callers that
    // know the database id.
    const userId = getUserId(res)
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(id)
    const row = isUuid
      ? await fetchSourceWithStats('id', id, userId)
      : await fetchSourceWithStats('slug', id, userId)
    if (!row) {
      res.status(404).json({
        error: t('sources.notFound', undefined, { defaultValue: 'Source not found' }),
      })
      return
    }
    res.json(mapSource(row))
  } catch (error) {
    logger.error('sources.getById', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier sources cap (tiers.ts maxSources) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could add unlimited private
// sources. Counts the user's own sources (global admin sources have user_id NULL, so excluded).
const enforceSourceLimit = enforceLimit<NewsAggregatorLimits>({
  limitType: 'maxSources',
  getLimit: (limits) => limits.maxSources,
  getCurrent: async (userId) =>
    count('sources', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceSourceLimit,
  validateBody(createSourceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const body = req.body as z.infer<typeof createSourceSchema>
      const result = await create('sources', {
        user_id: userId,
        name: body.name,
        feed_url: body.feed_url,
        website_url: body.website_url ?? null,
        category_id: body.category_id ?? null,
        icon_url: body.icon_url ?? null,
        is_active: true,
        last_fetched_at: null,
        article_count: 0,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('sources.create', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamsSchema),
  validateBody(updateSourceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const id = getParam(req.params.id)
      const existing = await findById<{ user_id?: string | null }>('sources', id)
      if (!existing) {
        res.status(404).json({
          error: t('sources.notFound', undefined, { defaultValue: 'Source not found' }),
        })
        return
      }
      // Only the owner of a user-scoped source may mutate it. Global
      // sources (no user_id) are read-only via this handler.
      if (!existing.user_id || existing.user_id !== userId) {
        res.status(403).json({
          error: t('common.forbidden', undefined, { defaultValue: 'Forbidden' }),
        })
        return
      }
      const result = await updateById('sources', id, req.body)
      res.json(result.data)
    } catch (error) {
      logger.error('sources.update', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParam(req.params.id)
    const existing = await findById<{ user_id?: string | null }>('sources', id)
    if (!existing) {
      res.status(404).json({
        error: t('sources.notFound', undefined, { defaultValue: 'Source not found' }),
      })
      return
    }
    if (!existing.user_id || existing.user_id !== userId) {
      res.status(403).json({
        error: t('common.forbidden', undefined, { defaultValue: 'Forbidden' }),
      })
      return
    }
    await deleteById('sources', id)
    res.status(204).end()
  } catch (error) {
    logger.error('sources.delete', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
