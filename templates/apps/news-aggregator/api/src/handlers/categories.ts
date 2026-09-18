/**
 * News category CRUD + per-user interest toggling.
 *
 * Categories are read-public and admin-write. Interest toggle scopes
 * `user_interests` rows by the authenticated user — never trusts a
 * request-supplied `user_id`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().default('newspaper'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default('#3b82f6'),
  sort_order: z.number().int().min(0).optional().default(0),
})

const idParamsSchema = z.object({ id: z.string().min(1) })
const slugParamsSchema = z.object({ slug: z.string().min(1) })
const interestBodySchema = z.object({}).passthrough()

const getParam = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await findMany('news_categories', {
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })
    res.json(categories)
  } catch (error) {
    logger.error('categories.list', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/by-slug/:slug',
  validateParams(slugParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const slug = getParam(req.params.slug)
      const category = await findOne('news_categories', [
        { field: 'slug', operator: '=', value: slug },
      ])
      if (!category) {
        res.status(404).json({
          error: t('categories.notFound', undefined, { defaultValue: 'Category not found' }),
        })
        return
      }
      res.json(category)
    } catch (error) {
      logger.error('categories.getBySlug', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/',
  requireAdmin,
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createCategorySchema>
      const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const result = await create('news_categories', {
        name: body.name,
        slug,
        icon: body.icon,
        color: body.color,
        sort_order: body.sort_order,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('categories.create', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Toggle a user's interest in a category. Always scopes by the
 * authenticated `userId` so a user can only ever flip their OWN row —
 * preventing IDOR even if `:id` is the category id (the join row's
 * primary key is composite-unique on (user_id, category_id)).
 */
router.post(
  '/:id/interest',
  validateParams(idParamsSchema),
  validateBody(interestBodySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const categoryId = getParam(req.params.id)

      const existing = await findOne<{ id: string; active: boolean }>('user_interests', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'category_id', operator: '=', value: categoryId },
      ])

      if (existing) {
        await updateById('user_interests', existing.id, { active: !existing.active })
        res.json({ interested: !existing.active })
        return
      }

      await create('user_interests', {
        user_id: userId,
        category_id: categoryId,
        active: true,
        created_at: new Date().toISOString(),
      })
      res.json({ interested: true })
    } catch (error) {
      logger.error('categories.interest', error)
      res.status(500).json({
        error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response) => {
  try {
    const category = await findById('news_categories', getParam(req.params.id))
    if (!category) {
      res.status(404).json({
        error: t('categories.notFound', undefined, { defaultValue: 'Category not found' }),
      })
      return
    }
    res.json(category)
  } catch (error) {
    logger.error('categories.getById', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
