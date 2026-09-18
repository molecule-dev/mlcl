/**
 * Topic endpoints — list, by-slug, follow toggle, stories-by-topic.
 *
 * Topics are surfaced to the frontend as the broad reading buckets (World,
 * Tech, Business, …). Internally they map 1:1 to the `news_categories`
 * table; per-user follow state is stored in `user_interests` so a single
 * row drives both "follow this topic" and the for-you feed.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const slugParamsSchema = z.object({ slug: z.string().min(1) })

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  tint: string
  sort_order: number
}

interface TopicResponse {
  id: string
  slug: string
  label: string
  icon: string
  tint: string
  story_count: number
  average_bias: number
  accent_color: string
  following: boolean
}

const getParam = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value)

const buildTopic = (
  row: CategoryRow,
  storyCount: number,
  averageBias: number,
  following: boolean,
): TopicResponse => ({
  id: row.id,
  slug: row.slug,
  label: row.name,
  icon: row.icon,
  tint: row.tint,
  story_count: storyCount,
  average_bias: averageBias,
  accent_color: row.color,
  following,
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const cats = await findMany<CategoryRow>('news_categories', {
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })

    if (cats.length === 0) {
      res.json([])
      return
    }

    const ids = cats.map((c) => c.id)
    const stats = await query<{
      category_id: string
      story_count: string
      average_bias: string | null
    }>(
      `SELECT category_id, COUNT(*)::text AS story_count,
              AVG(bias_score)::text AS average_bias
       FROM articles
       WHERE category_id = ANY($1::uuid[])
       GROUP BY category_id`,
      [ids],
    )
    const statsByCat = new Map(stats.rows.map((r) => [r.category_id, r]))

    let followingSet = new Set<string>()
    if (userId) {
      const follows = await findMany<{ category_id: string; active: boolean }>('user_interests', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'active', operator: '=', value: true },
        ],
      })
      followingSet = new Set(follows.map((f) => f.category_id))
    }

    const topics = cats.map((c) => {
      const stat = statsByCat.get(c.id)
      return buildTopic(
        c,
        stat ? Number(stat.story_count) : 0,
        stat?.average_bias ? Number(stat.average_bias) : 0,
        followingSet.has(c.id),
      )
    })
    res.json(topics)
  } catch (error) {
    logger.error('topics.list', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:slug', validateParams(slugParamsSchema), async (req: Request, res: Response) => {
  try {
    const slug = getParam(req.params.slug)
    const cat = await findOne<CategoryRow>('news_categories', [
      { field: 'slug', operator: '=', value: slug },
    ])
    if (!cat) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found' }),
      })
      return
    }
    const stats = await query<{ story_count: string; average_bias: string | null }>(
      `SELECT COUNT(*)::text AS story_count, AVG(bias_score)::text AS average_bias
       FROM articles WHERE category_id = $1`,
      [cat.id],
    )
    const stat = stats.rows[0]
    const userId = getUserId(res)
    let following = false
    if (userId) {
      const f = await findOne<{ active: boolean }>('user_interests', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'category_id', operator: '=', value: cat.id },
      ])
      following = f?.active === true
    }
    res.json(
      buildTopic(
        cat,
        stat ? Number(stat.story_count) : 0,
        stat?.average_bias ? Number(stat.average_bias) : 0,
        following,
      ),
    )
  } catch (error) {
    logger.error('topics.getBySlug', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Returns the stories assigned to a topic in the polished `Story` shape
 * the frontend expects (headline / excerpt / topic / topic_slug /
 * source_count / average_bias / image_url).
 */
router.get(
  '/:slug/stories',
  validateParams(slugParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const slug = getParam(req.params.slug)
      const cat = await findOne<CategoryRow>('news_categories', [
        { field: 'slug', operator: '=', value: slug },
      ])
      if (!cat) {
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
                a.image_url, a.published_at
         FROM articles a
         JOIN news_categories c ON c.id = a.category_id
         WHERE a.category_id = $1
         ORDER BY a.published_at DESC NULLS LAST
         LIMIT 50`,
        [cat.id],
      )
      const stories = result.rows.map((r) => ({
        ...r,
        average_bias: r.average_bias ? Number(r.average_bias) : 0,
      }))
      res.json(stories)
    } catch (error) {
      logger.error('topics.stories', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Toggle follow on a topic. Authenticated only. Returns `{ following }`.
 * Always scopes the join row by the authenticated user — never trusts a
 * request-supplied user id.
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
      const cat = await findOne<CategoryRow>('news_categories', [
        { field: 'slug', operator: '=', value: slug },
      ])
      if (!cat) {
        res.status(404).json({
          error: t('topics.notFound', undefined, { defaultValue: 'Topic not found' }),
        })
        return
      }
      const result = await query<{ active: boolean }>(
        `INSERT INTO user_interests (user_id, category_id, active, created_at)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (user_id, category_id) DO UPDATE SET
           active = NOT user_interests.active,
           "updatedAt" = NOW()
         RETURNING active`,
        [userId, cat.id],
      )
      const following = result.rows[0]?.active === true
      res.json({ following, slug })
    } catch (error) {
      logger.error('topics.follow', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
