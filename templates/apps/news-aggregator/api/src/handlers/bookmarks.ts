/**
 * Per-user bookmark CRUD on top of the canonical
 * `@molecule/api-resource-bookmark` table:
 *   bookmarks(id, userId, resourceType, resourceId, folder, createdAt, updatedAt)
 *
 * News-aggregator stores one row per saved article using
 * `resourceType = 'article'` and `resourceId = article_id` so the same
 * generic resource powers many entity types (articles, sources, …).
 *
 * Always scopes by the authenticated `userId` so a user can only ever
 * read / create / delete their OWN bookmarks. Validation via
 * `@molecule/api-middleware-validation`.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findOne, query } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { NewsAggregatorLimits } from '../tiers.js'

const router = Router()

const RESOURCE_TYPE = 'article'

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
})

const idParamsSchema = z.object({ id: z.string().min(1) })

const createBookmarkSchema = z.object({
  article_id: z.string().min(1),
})

const getParam = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value)

/**
 * Returns the user's bookmarked stories in the polished `Story` shape so
 * the Saved page can render them directly with `StoryListItem`. Each row
 * carries `id` (the *story* id, used by /stories/:id) plus a `bookmark_id`
 * for delete operations.
 */
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const result = await query<{
      bookmark_id: string
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
      created_at: string
    }>(
      `SELECT b.id AS bookmark_id, a.id, a.title AS headline, a.excerpt,
              a.content AS body, c.name AS topic, c.slug AS topic_slug,
              a.source_count, a.bias_score::text AS average_bias,
              a.image_url, a.published_at, b."createdAt" AS created_at
       FROM bookmarks b
       JOIN articles a ON a.id::text = b."resourceId"
       JOIN news_categories c ON c.id = a.category_id
       WHERE b."userId" = $1::uuid AND b."resourceType" = $2
       ORDER BY b."createdAt" DESC
       LIMIT $3 OFFSET $4`,
      [userId, RESOURCE_TYPE, limit, (page - 1) * limit],
    )
    res.json(
      result.rows.map((r) => ({
        bookmark_id: r.bookmark_id,
        id: r.id,
        headline: r.headline,
        excerpt: r.excerpt,
        body: r.body,
        topic: r.topic,
        topic_slug: r.topic_slug,
        source_count: r.source_count,
        average_bias: r.average_bias ? Number(r.average_bias) : 0,
        image_url: r.image_url,
        published_at: r.published_at,
        created_at: r.created_at,
        saved: true,
      })),
    )
  } catch (error) {
    logger.error('bookmarks.list', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier bookmarks cap (tiers.ts maxBookmarks) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could bookmark unlimited.
const enforceBookmarkLimit = enforceLimit<NewsAggregatorLimits>({
  limitType: 'maxBookmarks',
  getLimit: (limits) => limits.maxBookmarks,
  getCurrent: async (userId) =>
    count('bookmarks', [{ field: 'userId', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceBookmarkLimit,
  validateBody(createBookmarkSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const { article_id } = req.body as z.infer<typeof createBookmarkSchema>

      const existing = await findOne<{ id: string }>('bookmarks', [
        { field: 'userId', operator: '=', value: userId },
        { field: 'resourceType', operator: '=', value: RESOURCE_TYPE },
        { field: 'resourceId', operator: '=', value: article_id },
      ])

      if (existing) {
        res.json({ bookmarked: true, id: existing.id })
        return
      }

      const result = await create('bookmarks', {
        userId,
        resourceType: RESOURCE_TYPE,
        resourceId: article_id,
      })
      const created = result.data as { id?: string } | undefined
      res.status(201).json({
        bookmarked: true,
        id: created?.id,
        data: { ...created, article_id },
      })
    } catch (error) {
      logger.error('bookmarks.create', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Delete a bookmark by *story id* — what the frontend has when toggling
 * the save icon on a story. Always scoped to the authenticated user.
 */
router.delete(
  '/by-story/:id',
  validateParams(idParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const storyId = getParam(req.params.id)
      const existing = await findOne<{ id: string }>('bookmarks', [
        { field: 'userId', operator: '=', value: userId },
        { field: 'resourceType', operator: '=', value: RESOURCE_TYPE },
        { field: 'resourceId', operator: '=', value: storyId },
      ])
      if (!existing) {
        res.json({ bookmarked: false })
        return
      }
      await deleteById('bookmarks', existing.id)
      res.json({ bookmarked: false })
    } catch (error) {
      logger.error('bookmarks.deleteByStory', error)
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
    const existing = await findById<{ userId?: string }>('bookmarks', id)
    if (!existing) {
      res.status(404).json({
        error: t('bookmarks.notFound', undefined, { defaultValue: 'Bookmark not found' }),
      })
      return
    }
    if (existing.userId !== userId) {
      res.status(403).json({
        error: t('common.forbidden', undefined, { defaultValue: 'Forbidden' }),
      })
      return
    }
    await deleteById('bookmarks', id)
    res.status(204).end()
  } catch (error) {
    logger.error('bookmarks.delete', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
