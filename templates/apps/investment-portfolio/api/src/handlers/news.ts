import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getProvider, hasProvider } from '@molecule/api-ai'
import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

const router = Router()

interface NewsRow {
  id?: string
  title?: string
  source?: string | null
  summary?: string | null
  content?: string | null
  url?: string | null
  symbol?: string | null
  related_symbols?: unknown
  published_at?: string | Date
}

const toRelatedArray = (raw: unknown, fallback?: string | null): string[] => {
  if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === 'string')
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
    } catch (_error) {
      // not JSON — fall through to string fallback
    }
  }
  if (fallback) return [fallback]
  return []
}

const toItem = (row: NewsRow): Record<string, unknown> => ({
  id: row.id,
  title: row.title ?? '',
  source: row.source ?? '',
  summary: row.summary ?? '',
  url: row.url ?? '',
  symbol: row.symbol ?? null,
  related_symbols: toRelatedArray(row.related_symbols, row.symbol ?? null),
  published_at: row.published_at ?? new Date(),
})

const newsListSchema = z.object({
  symbol: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

const newsSearchSchema = z.object({
  q: z.string().min(1),
})

router.get(
  '/',
  validateQuery(newsListSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = req.query.symbol as string | undefined
      const limit = req.query.limit as string | undefined
      const offset = req.query.offset as string | undefined
      const where: WhereCondition[] = []
      if (symbol) where.push({ field: 'symbol', operator: '=', value: symbol })

      const orderBy: OrderBy[] = [{ field: 'published_at', direction: 'desc' }]

      const articles = (await findMany<NewsRow>('news_articles', {
        where,
        orderBy,
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
      })) as NewsRow[]
      res.json(articles.map(toItem))
    } catch (error) {
      logger.error('news list failed', error)
      next(error)
    }
  },
)

router.get(
  '/search',
  validateQuery(newsSearchSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const q = req.query.q as string
    try {
      const results = await search('news_articles', { text: q, perPage: 20 })
      res.json(results)
      return
    } catch (error) {
      logger.warn('news search bond failed; falling back to LIKE query', error)
    }
    // Fallback: SQL LIKE on title/summary so the endpoint works even if the
    // Meilisearch index hasn't been created yet (dev environments, fresh
    // databases, etc.).
    try {
      const articles = (await findMany<NewsRow>('news_articles', {
        where: [{ field: 'title', operator: 'ilike', value: q }],
        orderBy: [{ field: 'published_at', direction: 'desc' }],
        limit: 20,
      })) as NewsRow[]
      res.json({ hits: articles.map(toItem), query: q, fallback: true })
    } catch (error) {
      logger.error('news search LIKE fallback failed', error)
      next(error)
    }
  },
)

router.post(
  '/:id/summarize',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Auth gate: summarize triggers a metered LLM call, so it must never be
      // reachable anonymously (an unauthenticated caller could otherwise run up
      // the owner's AI bill). Fail closed in the handler — do not rely on a
      // route middleware that codegen may drop — matching every other route.
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const article = await findById<NewsRow>('news_articles', id)
      if (!article) {
        res.status(404).json({ error: t('news.notFound') })
        return
      }
      const text = article.content ?? article.summary ?? ''
      let summary = text.length > 280 ? text.slice(0, 277) + '...' : text
      if (hasProvider()) {
        const provider = getProvider()
        if (provider) {
          let collected = ''
          for await (const event of provider.chat({
            messages: [
              {
                role: 'user',
                content: `Summarize this market-news article in 3 short bullet points:\n\n${text}`,
              },
            ],
            maxTokens: 400,
          })) {
            if (event.type === 'text') collected += event.content
            if (event.type === 'done') break
            if (event.type === 'error') break
          }
          if (collected.trim()) summary = collected.trim()
        }
      }
      res.json({ summary })
    } catch (error) {
      logger.error('news summarize failed', error)
      next(error)
    }
  },
)

export default router
