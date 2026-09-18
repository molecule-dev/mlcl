import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import type { HelpdeskLimits } from '../tiers.js'

const router = Router()

// KB articles are publicly readable (anonymous customers can browse the
// help center). The kb_articles table has no per-user owner column that is
// enforced on write — author_id is stamped on create but ignored on
// update/delete — so EVERY mutation (create/update/delete) is operator-only
// and gated behind `requireAdmin`. An authenticated session alone is NOT
// sufficient to inject, edit, or remove KB content: otherwise any registered
// user (including an end customer who just filed a ticket) could publish into
// the public help center. verifyMiddleware upstream populates
// res.locals.session for cookie / Bearer-bearing requests; anonymous
// requests reach the handler with res.locals.session === undefined.

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const articleStatusEnum = z.enum(['draft', 'published', 'archived'])

const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  category: z.string().optional(),
  status: articleStatusEnum.optional().default('draft'),
})

const updateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  status: articleStatusEnum.optional(),
})

const listArticlesQuery = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional().default('published'),
  sort: z.string().optional().default('updated_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
})

// ---------------------------------------------------------------------------
// GET / — List articles
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listArticlesQuery), async (req: Request, res: Response) => {
  try {
    const { search, category, status, sort, order, limit, offset } =
      req.query as unknown as z.infer<typeof listArticlesQuery>

    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (search) where.push({ field: 'title', operator: 'ilike', value: search })

    const articles = await findMany('kb_articles', {
      where,
      orderBy: [{ field: sort ?? 'updated_at', direction: order ?? 'desc' }],
      limit,
      offset,
    })

    res.json(articles)
  } catch (err) {
    console.error('Failed to list articles', err)
    res
      .status(500)
      .json({ error: t('articles.listFailed', {}, { defaultValue: 'Failed to list articles' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Get article by ID
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const article = await findById('kb_articles', id)

    if (!article) {
      return res
        .status(404)
        .json({ error: t('articles.notFound', {}, { defaultValue: 'Article not found' }) })
    }

    res.json(article)
  } catch (err) {
    console.error('Failed to get article', err)
    res
      .status(500)
      .json({ error: t('articles.getFailed', {}, { defaultValue: 'Failed to get article' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Create article
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAdmin,
  enforceLimit<HelpdeskLimits>({
    limitType: 'maxKbArticles',
    getLimit: (limits) => limits.maxKbArticles,
    getCurrent: async (userId) =>
      count('kb_articles', [{ field: 'author_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createArticleSchema),
  async (req: Request, res: Response) => {
    try {
      // requireAdmin guarantees an authenticated operator session here; the
      // in-handler check is defense-in-depth so the handler fails closed even
      // if the route middleware is ever dropped.
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const { title, body, category, status } = req.body

      const result = await create('kb_articles', {
        title,
        body,
        category: category ?? null,
        status,
        author_id: userId,
      })

      res.status(201).json(result.data)
    } catch (err) {
      console.error('Failed to create article', err)
      res.status(500).json({
        error: t('articles.createFailed', {}, { defaultValue: 'Failed to create article' }),
      })
    }
  },
)

// ---------------------------------------------------------------------------
// PATCH /:id — Update article
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireAdmin,
  validateBody(updateArticleSchema),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string
      const article = await findById('kb_articles', id)

      if (!article) {
        return res
          .status(404)
          .json({ error: t('articles.notFound', {}, { defaultValue: 'Article not found' }) })
      }

      const result = await updateById('kb_articles', id, req.body)

      res.json(result.data)
    } catch (err) {
      console.error('Failed to update article', err)
      res.status(500).json({
        error: t('articles.updateFailed', {}, { defaultValue: 'Failed to update article' }),
      })
    }
  },
)

// ---------------------------------------------------------------------------
// DELETE /:id — Delete article
// ---------------------------------------------------------------------------

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const article = await findById('kb_articles', id)

    if (!article) {
      return res
        .status(404)
        .json({ error: t('articles.notFound', {}, { defaultValue: 'Article not found' }) })
    }

    await deleteById('kb_articles', id)

    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete article', err)
    res
      .status(500)
      .json({ error: t('articles.deleteFailed', {}, { defaultValue: 'Failed to delete article' }) })
  }
})

export default router
