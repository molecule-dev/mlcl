/**
 * Story endpoints — list, by-id, coverage, search.
 *
 * Stories in news-aggregator are clustered headlines (one per news event)
 * stored in the `articles` table. Each story has multiple per-source
 * framings stored in `story_coverage`. The polished frontend renders the
 * coverage on /stories/:id under "How each outlet framed it".
 *
 * Read-only via this handler — writes happen on the cron RSS-fetch path.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idParamsSchema = z.object({ id: z.string().min(1) })
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  topic: z.string().optional(),
  source: z.string().optional(),
})
const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
})

const getParam = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value)

interface StoryRow {
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
}

const mapStory = (
  r: StoryRow & { saved?: boolean | null },
): {
  id: string
  headline: string
  excerpt: string | null
  body: string | null
  topic: string
  topic_slug: string
  source_count: number
  average_bias: number
  image_url: string | null
  published_at: string
  saved: boolean
} => ({
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
  saved: r.saved ?? false,
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, topic, source } = req.query as unknown as z.infer<typeof listQuerySchema>
    const userId = getUserId(res)
    const params: unknown[] = []
    const where: string[] = []

    if (topic) {
      params.push(topic)
      where.push(`c.slug = $${params.length}`)
    }
    if (source) {
      params.push(source)
      where.push(
        `EXISTS (SELECT 1 FROM story_coverage sc JOIN sources src ON src.id = sc.source_id
                 WHERE sc.article_id = a.id AND src.slug = $${params.length})`,
      )
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const savedJoin = userId
      ? `LEFT JOIN bookmarks bk
           ON bk."userId" = $${params.length + 1}::uuid
          AND bk."resourceType" = 'article'
          AND bk."resourceId" = a.id::text`
      : ''
    if (userId) params.push(userId)

    params.push(limit, (page - 1) * limit)
    const limitOff = `LIMIT $${params.length - 1} OFFSET $${params.length}`

    const result = await query<StoryRow & { saved?: boolean | null }>(
      `SELECT a.id, a.title AS headline, a.excerpt, a.content AS body,
              c.name AS topic, c.slug AS topic_slug,
              a.source_count, a.bias_score::text AS average_bias,
              a.image_url, a.published_at
              ${userId ? ', (bk.id IS NOT NULL) AS saved' : ''}
       FROM articles a
       JOIN news_categories c ON c.id = a.category_id
       ${savedJoin}
       ${whereSql}
       ORDER BY a.published_at DESC NULLS LAST
       ${limitOff}`,
      params,
    )
    res.json(result.rows.map(mapStory))
  } catch (error) {
    logger.error('stories.list', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const result = await query<StoryRow>(
      `SELECT a.id, a.title AS headline, a.excerpt, a.content AS body,
              c.name AS topic, c.slug AS topic_slug,
              a.source_count, a.bias_score::text AS average_bias,
              a.image_url, a.published_at
       FROM articles a
       JOIN news_categories c ON c.id = a.category_id
       WHERE a.title ILIKE $1 OR a.excerpt ILIKE $1 OR a.content ILIKE $1
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT $2`,
      [`%${q}%`, limit],
    )
    res.json(result.rows.map(mapStory))
  } catch (error) {
    logger.error('stories.search', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const userId = getUserId(res)
    const params: unknown[] = [id]
    const savedSelect = userId ? `, (bk.id IS NOT NULL) AS saved` : ''
    const savedJoin = userId
      ? `LEFT JOIN bookmarks bk
           ON bk."userId" = $2::uuid
          AND bk."resourceType" = 'article'
          AND bk."resourceId" = a.id::text`
      : ''
    if (userId) params.push(userId)

    const result = await query<StoryRow & { saved?: boolean | null }>(
      `SELECT a.id, a.title AS headline, a.excerpt, a.content AS body,
              c.name AS topic, c.slug AS topic_slug,
              a.source_count, a.bias_score::text AS average_bias,
              a.image_url, a.published_at
              ${savedSelect}
       FROM articles a
       JOIN news_categories c ON c.id = a.category_id
       ${savedJoin}
       WHERE a.id::text = $1
       LIMIT 1`,
      params,
    )
    const row = result.rows[0]
    if (!row) {
      res.status(404).json({
        error: t('stories.notFound', undefined, { defaultValue: 'Story not found' }),
      })
      return
    }
    res.json(mapStory(row))
  } catch (error) {
    logger.error('stories.getById', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/coverage', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const story = await findOne<{ id: string }>('articles', [
      { field: 'id', operator: '=', value: id },
    ])
    if (!story) {
      res.json([])
      return
    }
    const result = await query<{
      source_slug: string
      source_name: string
      bias_value: string | null
      factual_rating: number
      headline: string
      excerpt: string | null
      url: string
      published_at: string
    }>(
      `SELECT s.slug AS source_slug, s.name AS source_name,
                s.bias_value::text AS bias_value, s.factual_rating,
                cov.headline, cov.excerpt, cov.url, cov.published_at
         FROM story_coverage cov
         JOIN sources s ON s.id = cov.source_id
         WHERE cov.article_id = $1
         ORDER BY cov.published_at ASC`,
      [id],
    )
    res.json(
      result.rows.map((r) => ({
        source_slug: r.source_slug,
        source_name: r.source_name,
        bias_value: r.bias_value ? Number(r.bias_value) : 0,
        factual_rating: r.factual_rating,
        headline: r.headline,
        excerpt: r.excerpt,
        url: r.url,
        published_at: r.published_at,
      })),
    )
  } catch (error) {
    logger.error('stories.coverage', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
