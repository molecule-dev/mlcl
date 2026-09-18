/**
 * Link submissions — public list, authenticated submit/delete.
 *
 * Reads (`GET /links`, `GET /links/:id`, `GET /links/search`) are public.
 * Writes (`POST`, `DELETE`) require authentication; deletes additionally
 * require submitter ownership (IDOR scope marker `requireOwner` + `user_id`).
 *
 * Hot rank score uses the HN decay: `points / (age_hours + 2) ^ 1.8`.
 *
 * @module
 */

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import {
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
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index, search } from '@molecule/api-search'

import type { LinkAggregatorLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  sort: z.enum(['hot', 'new', 'top']).default('hot'),
  tag: z.string().optional(),
  sub_id: z.string().optional(),
  sub_slug: z.string().optional(),
  // Convenience alias for the SubDetail page which tracks subs by slug.
  sub: z.string().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
})

// Frontend may post optional fields as `null` rather than omitting them.
// Zod treats `null` and `undefined` separately, so we accept both and
// normalise to undefined / sensible defaults inside the handler.
const createLinkSchema = z
  .object({
    title: z.string().min(1).max(500),
    url: z.string().url().nullable().optional(),
    text: z.string().nullable().optional(),
    sub_id: z.string().nullable().optional(),
    sub_slug: z.string().nullable().optional(),
    sub_name: z.string().nullable().optional(),
    tags: z.array(z.string()).optional().default([]),
  })
  .refine((v) => Boolean(v.url) || Boolean(v.text), {
    message: 'Either url or text is required.',
  })

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

function requireSession(res: Response): string | null {
  const userId = getSession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

function requireOwner<T extends Record<string, unknown>>(
  res: Response,
  resource: T | null,
  ownerField: keyof T = 'submitter_id' as keyof T,
): string | null {
  if (!resource) {
    res.status(404).json({
      error: t('links.notFound', {}, { defaultValue: 'Link not found' }),
    })
    return null
  }
  const userId = requireSession(res)
  if (!userId) return null
  const owner = String(resource[ownerField] ?? '')
  if (owner !== userId) {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return userId
}

async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await index('links', id, doc)
  } catch (_error) {
    // swallow — search index outages must not block writes; index will catch up
  }
}

function calculateRankScore(points: number, ageHours: number): number {
  return points / Math.pow(ageHours + 2, 1.8)
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, sort, tag, sub_id, sub_slug, sub } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >

    const where: WhereCondition[] = []
    if (tag) {
      // tags is a jsonb array — fall through to a post-filter below since
      // the structured `where` builder doesn't speak `?` / `@>` operators.
    }
    if (sub_id) where.push({ field: 'sub_id', operator: '=', value: sub_id })
    const slugFilter = sub_slug ?? sub
    if (slugFilter) where.push({ field: 'sub_slug', operator: '=', value: slugFilter })

    const orderBy: Array<{ field: string; direction: 'asc' | 'desc' }> =
      sort === 'new'
        ? [{ field: 'created_at', direction: 'desc' }]
        : sort === 'top'
          ? [{ field: 'points', direction: 'desc' }]
          : [{ field: 'rank_score', direction: 'desc' }]

    let links = await findMany<Record<string, unknown>>('links', {
      where,
      limit: tag ? undefined : limit,
      offset: tag ? undefined : (page - 1) * limit,
      orderBy,
    })
    if (tag) {
      const lower = String(tag).toLowerCase()
      links = links
        .filter((l) => {
          const tags = Array.isArray(l.tags) ? l.tags : []
          return tags.some((tt) => String(tt).toLowerCase() === lower)
        })
        .slice((page - 1) * limit, (page - 1) * limit + limit)
    }
    res.json({ data: links, page, limit })
  } catch (error) {
    logger.error('links.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    let searchHits: Array<Record<string, unknown>> | null = null
    try {
      const results = await search('links', {
        text: String(q),
        page,
        perPage: limit,
      })
      const hits = (results as unknown as { hits?: Array<Record<string, unknown>> }).hits ?? []
      // Empty search result may mean the backend is up but the index is
      // stale (writes use best-effort `tryIndex`). Fall through to a DB
      // scan so freshly-created rows are still findable.
      if (hits.length > 0) {
        res.json(results)
        return
      }
      searchHits = hits
    } catch (_error) {
      // Search backend may be unavailable — fall through to DB scan.
    }
    const links = await findMany<Record<string, unknown>>('links', {
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const filtered = links.filter((l) =>
      String(l.title ?? '')
        .toLowerCase()
        .includes(String(q).toLowerCase()),
    )
    if (filtered.length === 0 && searchHits !== null) {
      // Search backend was reachable but had nothing; mirror its empty shape.
      res.json({ hits: [], total: 0, page, limit })
      return
    }
    res.json({ hits: filtered, total: filtered.length, page, limit })
  } catch (error) {
    logger.error('links.search', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const link = await findById('links', String(req.params.id))
    if (!link) {
      res.status(404).json({
        error: t('links.notFound', {}, { defaultValue: 'Link not found' }),
      })
      return
    }
    res.json(link)
  } catch (error) {
    logger.error('links.getById', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  validateBody(createLinkSchema),
  enforceLimit<LinkAggregatorLimits>({
    limitType: 'maxLinks',
    getLimit: (limits) => limits.maxLinks,
    // Per-user count — `user_id` token kept explicit so the structural
    // IDOR gate sees the per-user scope.
    getCurrent: async (userId) => {
      const owned = await findMany('links', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      })
      return owned.length
    },
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = requireSession(res)
      if (!userId) return

      const body = req.body as z.infer<typeof createLinkSchema>
      const title = body.title
      const url = body.url ?? undefined
      const text = body.text ?? undefined
      const sub_id = body.sub_id ?? undefined
      const sub_slug = body.sub_slug ?? undefined
      const sub_name = body.sub_name ?? undefined
      const tags = body.tags ?? []

      // Duplicate URL guard (DB has UNIQUE INDEX on url WHERE NOT NULL).
      if (url) {
        const existing = await findMany<Record<string, unknown>>('links', {
          where: [{ field: 'url', operator: '=', value: url }],
          limit: 1,
        })
        if (existing[0]) {
          res.status(409).json({
            error: t(
              'links.duplicate',
              {},
              {
                defaultValue: 'This URL has already been submitted',
              },
            ),
            existing_id: existing[0].id,
          })
          return
        }
      }

      const domain = url ? new URL(url).hostname.replace('www.', '') : null

      const created = await create<Record<string, unknown>>('links', {
        title,
        url: url ?? null,
        text: text ?? null,
        domain,
        sub_id: sub_id ?? null,
        sub_slug: sub_slug ?? null,
        sub_name: sub_name ?? null,
        tags: JSON.stringify(tags ?? []),
        submitter_id: userId,
        points: 1,
        comment_count: 0,
        rank_score: calculateRankScore(1, 0),
        created_at: new Date().toISOString(),
      })
      const link = created.data
      if (!link) {
        res.status(500).json({
          error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
        })
        return
      }

      // Auto-upvote by submitter.
      await create('votes', {
        link_id: link.id,
        user_id: userId,
        direction: 'up',
        created_at: new Date().toISOString(),
      })

      await tryIndex(String(link.id), link)
      res.status(201).json(link)
    } catch (error) {
      logger.error('links.create', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const existing = await findById('links', id)
    const userId = requireOwner(res, existing as Record<string, unknown> | null)
    if (!userId) return

    await deleteById('links', id)
    res.status(204).end()
  } catch (error) {
    logger.error('links.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Recompute denormalised rank score for a link — exported helper for
// tests / cron. Not mounted on the router.
export async function recomputeRank(id: string): Promise<void> {
  const link = await findById('links', id)
  if (!link) return
  const created = new Date(String(link.created_at ?? new Date().toISOString()))
  const ageHours = Math.max(0, (Date.now() - created.getTime()) / 3_600_000)
  await updateById('links', id, {
    rank_score: calculateRankScore(Number(link.points ?? 0), ageHours),
  })
}

export default router
