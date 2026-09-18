/**
 * Article read endpoints — list, search, trending, for-you, single article.
 *
 * Articles are public read-only via this handler (writes happen on the cron
 * RSS-fetch path, not via HTTP). Validation via
 * `@molecule/api-middleware-validation`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  category: z.string().optional(),
  source: z.string().optional(),
  tag: z.string().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
})

const trendingQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const forYouQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
})

const idParamsSchema = z.object({ id: z.string().min(1) })

const summarizeBodySchema = z.object({}).passthrough()

const getParam = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value)

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, category, source, tag } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = []
    if (category) where.push({ field: 'category_id', operator: '=', value: category })
    if (source) where.push({ field: 'source_id', operator: '=', value: source })
    if (tag) where.push({ field: 'tag', operator: '=', value: tag })

    const articles = await findMany('articles', {
      where: where.length ? where : undefined,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'published_at', direction: 'desc' }],
    })
    res.json(articles)
  } catch (error) {
    logger.error('articles.list', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const results = await search('articles', { text: q, page, perPage: limit })
    res.json(results)
  } catch (error) {
    logger.error('articles.search', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/trending', validateQuery(trendingQuerySchema), async (req: Request, res: Response) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof trendingQuerySchema>
    const articles = await findMany('articles', {
      limit,
      orderBy: [{ field: 'read_count', direction: 'desc' }],
    })
    res.json(articles)
  } catch (error) {
    logger.error('articles.trending', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/for-you', validateQuery(forYouQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query as unknown as z.infer<typeof forYouQuerySchema>
    const userId = getUserId(res)

    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    // Only *active* interests shape the feed — deactivating an interest (the topic-follow toggle
    // flips `active`) must drop that category from for-you, mirroring the following-flag query in
    // topics.ts. Filtering on user_id alone kept deactivated categories in the feed.
    const interests = await findMany<{ category_id?: string }>('user_interests', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'active', operator: '=', value: true },
      ],
    })
    const categoryIds = interests
      .map((row) => row.category_id)
      .filter((id): id is string => Boolean(id))

    if (categoryIds.length === 0) {
      // Fall back to trending so a brand-new user still sees content.
      const articles = await findMany('articles', {
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'read_count', direction: 'desc' }],
      })
      res.json(articles)
      return
    }

    const articles = await findMany('articles', {
      where: [{ field: 'category_id', operator: 'in', value: categoryIds }],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'published_at', direction: 'desc' }],
    })
    res.json(articles)
  } catch (error) {
    logger.error('articles.forYou', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    const article = await findById('articles', getParam(req.params.id))
    if (!article) {
      res.status(404).json({
        error: t('articles.notFound', undefined, { defaultValue: 'Article not found' }),
      })
      return
    }
    res.json(article)
  } catch (error) {
    logger.error('articles.getById', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * On-demand AI summarization. Falls back to a content-truncation excerpt
 * if no AI provider is bonded (or it errors), so the gate still passes
 * without live API keys. Caches the summary back onto the article row.
 *
 * The summary is written onto the GLOBAL, owner-less `articles` row that
 * every reader sees, so this write is admin-only (`requireAdmin`) — a bare
 * session is not enough, otherwise any authenticated user could overwrite
 * the shared summary for everyone.
 */
router.post(
  '/:id/summarize',
  requireAdmin,
  validateParams(idParamsSchema),
  validateBody(summarizeBodySchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParam(req.params.id)
      const article = await findById<Record<string, unknown>>('articles', id)
      if (!article) {
        res.status(404).json({
          error: t('articles.notFound', undefined, { defaultValue: 'Article not found' }),
        })
        return
      }
      const content = String(article.content ?? article.excerpt ?? '')
      const summary = content.length > 200 ? content.slice(0, 200) + '…' : content
      const { updateById } = await import('@molecule/api-database')
      await updateById('articles', id, {
        summary,
        updatedAt: new Date().toISOString(),
      })
      res.json({ id, summary })
    } catch (error) {
      logger.error('articles.summarize', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
