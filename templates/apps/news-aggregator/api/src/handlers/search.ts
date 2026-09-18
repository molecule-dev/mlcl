/**
 * Unified search across stories, sources, and topics.
 *
 * The frontend partitions the result list by `kind` ('story' | 'source' |
 * 'topic') so a single endpoint round-trip serves all three scope chips
 * on the search page. Case-insensitive ILIKE matching against headlines,
 * excerpts, source names/descriptions, and topic labels.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).default(40),
})

router.get('/', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const like = `%${q}%`

    const [storyResult, sourceResult, topicResult] = await Promise.all([
      query<{
        id: string
        headline: string
        excerpt: string | null
        topic: string
        topic_slug: string
        source_count: number
        average_bias: string | null
        image_url: string | null
        published_at: string
      }>(
        `SELECT a.id, a.title AS headline, a.excerpt,
                c.name AS topic, c.slug AS topic_slug,
                a.source_count, a.bias_score::text AS average_bias,
                a.image_url, a.published_at
         FROM articles a
         JOIN news_categories c ON c.id = a.category_id
         WHERE a.title ILIKE $1 OR a.excerpt ILIKE $1 OR a.content ILIKE $1
         ORDER BY a.published_at DESC NULLS LAST
         LIMIT $2`,
        [like, limit],
      ),
      query<{
        slug: string
        name: string
        description: string | null
        bias_value: string | null
        factual_rating: number
        accent_color: string | null
        story_count: string
      }>(
        `SELECT s.slug, s.name, s.description,
                s.bias_value::text AS bias_value, s.factual_rating, s.accent_color,
                (SELECT COUNT(*)::text FROM story_coverage sc WHERE sc.source_id = s.id) AS story_count
         FROM sources s
         WHERE s.user_id IS NULL
           AND (s.name ILIKE $1 OR s.description ILIKE $1)
         ORDER BY s.name ASC
         LIMIT $2`,
        [like, limit],
      ),
      query<{
        slug: string
        label: string
        icon: string
        tint: string
        accent_color: string
        story_count: string
      }>(
        `SELECT c.slug, c.name AS label, c.icon, c.tint, c.color AS accent_color,
                (SELECT COUNT(*)::text FROM articles a WHERE a.category_id = c.id) AS story_count
         FROM news_categories c
         WHERE c.name ILIKE $1 OR c.slug ILIKE $1
         ORDER BY c.sort_order ASC
         LIMIT $2`,
        [like, limit],
      ),
    ])

    const stories = storyResult.rows.map((r) => ({
      kind: 'story' as const,
      id: r.id,
      headline: r.headline,
      excerpt: r.excerpt,
      topic: r.topic,
      topic_slug: r.topic_slug,
      source_count: r.source_count,
      average_bias: r.average_bias ? Number(r.average_bias) : 0,
      image_url: r.image_url,
      published_at: r.published_at,
    }))

    const sources = sourceResult.rows.map((r) => ({
      kind: 'source' as const,
      slug: r.slug,
      name: r.name,
      description: r.description,
      bias_value: r.bias_value ? Number(r.bias_value) : 0,
      factual_rating: r.factual_rating,
      accent_color: r.accent_color,
      story_count: Number(r.story_count ?? 0),
      following: false,
    }))

    const topics = topicResult.rows.map((r) => ({
      kind: 'topic' as const,
      slug: r.slug,
      label: r.label,
      icon: r.icon,
      tint: r.tint,
      accent_color: r.accent_color,
      story_count: Number(r.story_count ?? 0),
    }))

    res.json([...stories, ...sources, ...topics])
  } catch (error) {
    logger.error('search.query', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
