import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createCategorySchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  hero_image_key: z.string().optional(),
  display_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

const updateCategorySchema = createCategorySchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query<Record<string, unknown>>(
      `SELECT c.*, COALESCE(sc.session_count, 0)::int AS session_count
         FROM meditation_categories c
         LEFT JOIN (
           SELECT category_id, COUNT(*)::int AS session_count
             FROM meditation_sessions
            WHERE is_published = true
            GROUP BY category_id
         ) sc ON sc.category_id = c.id
        WHERE c.is_active = true
        ORDER BY c.display_order ASC, c.label ASC`,
    )
    res.json(result.rows)
  } catch (error) {
    logger.error('categories.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findCategoryByIdOrSlug(idOrSlug: string): Promise<Record<string, unknown> | null> {
  if (UUID_RE.test(idOrSlug)) {
    const byId = await findById<Record<string, unknown>>('meditation_categories', idOrSlug)
    if (byId) return byId
  }
  const matches = await findMany<Record<string, unknown>>('meditation_categories', {
    where: [{ field: 'slug', operator: '=', value: idOrSlug }],
    limit: 1,
  })
  return matches[0] ?? null
}

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const idOrSlug = getParamId(req)
    const category = await findCategoryByIdOrSlug(idOrSlug)
    if (!category) {
      return res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
    }
    const sessions = await findMany('meditation_sessions', {
      where: [
        { field: 'category_id', operator: '=', value: category.id },
        { field: 'is_published', operator: '=', value: true },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ ...category, sessions })
  } catch (error) {
    logger.error('categories.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createCategorySchema>
      const result = await create('meditation_categories', {
        slug: body.slug,
        label: body.label,
        description: body.description ?? null,
        hero_image_key: body.hero_image_key ?? null,
        display_order: body.display_order ?? 0,
        is_active: body.is_active ?? true,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('categories.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('meditation_categories', id)
      if (!existing) {
        return res.status(404).json({
          error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
        })
      }
      const body = req.body as Partial<z.infer<typeof createCategorySchema>>
      const updates: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value
      }
      updates.updatedAt = new Date()
      const result = await updateById('meditation_categories', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('categories.update', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meditation_categories', id)
    if (!existing) {
      return res.status(404).json({
        error: t('categories.notFound', {}, { defaultValue: 'Category not found' }),
      })
    }

    await deleteById('meditation_categories', id)
    res.status(204).end()
  } catch (error) {
    logger.error('categories.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
