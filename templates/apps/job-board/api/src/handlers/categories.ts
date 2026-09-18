import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import type { JobBoardLimits } from '../tiers.js'

const router = Router()

const slugify = (value: string): string => value.toLowerCase().trim().replace(/\s+/g, '-')

const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140).optional(),
  description: z.string().default(''),
})

const updateCategorySchema = createCategorySchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await findMany('job_categories', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(categories)
  } catch (err) {
    console.error('[categories] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const category = await findById<Record<string, unknown>>('job_categories', id)
    if (!category) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    res.json(category)
  } catch (err) {
    console.error('[categories] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  // job_categories is a global, admin-style taxonomy (no per-user owner) — only
  // board administrators may create categories. requireAdmin runs before the
  // tier-limit check so an unauthorized caller is rejected (403) immediately.
  requireAdmin,
  enforceLimit<JobBoardLimits>({
    limitType: 'maxCategories',
    getLimit: (limits) => limits.maxCategories,
    // job_categories rows aren't user_id-scoped (admin-style taxonomy), but
    // we still gate creation behind the per-user tier limit so a single user
    // can't blow up the taxonomy. Falls back to total count for v1.
    getCurrent: async () => count('job_categories'),
  }) as unknown as RequestHandler,
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body as z.infer<typeof createCategorySchema>
      const slug = (req.body.slug as string | undefined) ?? slugify(name)

      const existing = await findOne<Record<string, unknown>>('job_categories', [
        { field: 'slug', operator: '=', value: slug },
      ])
      if (existing) {
        res.status(409).json({
          error: t(
            'categories.slugExists',
            {},
            { defaultValue: 'A category with this slug already exists' },
          ),
        })
        return
      }

      const result = await create('job_categories', {
        name,
        slug,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      console.error('[categories] handler failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// job_categories is a global, admin-style taxonomy (no per-user owner) — only
// board administrators may update categories.
router.put(
  '/:id',
  requireAdmin,
  validateBody(updateCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('job_categories', id)
      if (!existing) {
        res
          .status(404)
          .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
        return
      }

      const result = await updateById('job_categories', id, {
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      res.json(result.data)
    } catch (err) {
      console.error('[categories] handler failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// job_categories is a global, admin-style taxonomy (no per-user owner) — only
// board administrators may delete categories.
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const category = await findById<Record<string, unknown>>('job_categories', id)
    if (!category) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }

    await deleteById('job_categories', id)
    res.status(204).end()
  } catch (err) {
    console.error('[categories] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
