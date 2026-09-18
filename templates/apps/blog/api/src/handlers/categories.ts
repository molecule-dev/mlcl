import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
})

// --- Helpers ---

// The category taxonomy is a site-wide resource with no owner column, so its
// write routes are gated by a flat moderator/admin role check (mirrors
// comments.ts and the online-store requireAdmin precedent). Readers/authors keep
// read access via the public GET routes.
async function isModerator(userId: string): Promise<boolean> {
  const user = await findById<Record<string, unknown>>('users', userId)
  const role = user?.role
  return role === 'moderator' || role === 'admin'
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Routes ---

// List all categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await findMany('categories', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(categories)
  } catch (error) {
    logger.error('categories.list failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get category by slug
router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const categories = await findMany('categories', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    const category = categories[0]
    if (!category) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    res.json(category)
  } catch (error) {
    logger.error('categories.bySlug failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await findById('categories', getParamId(req))
    if (!category) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    res.json(category)
  } catch (error) {
    logger.error('categories.getById failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create category (auth required)
router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response) => {
  try {
    const session = res.locals.session as { userId?: string } | undefined
    if (!session?.userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(session.userId))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const { name, description } = req.body
    const slug = generateSlug(name)

    const result = await create('categories', {
      name,
      slug,
      description,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('categories.create failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update category (auth required)
router.put('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  try {
    const session = res.locals.session as { userId?: string } | undefined
    if (!session?.userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(session.userId))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById('categories', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }

    const updates: Record<string, unknown> = { ...req.body }
    if (req.body.name) {
      updates.slug = generateSlug(req.body.name)
    }

    const result = await updateById('categories', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('categories.update failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete category (auth required)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = res.locals.session as { userId?: string } | undefined
    if (!session?.userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isModerator(session.userId))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById('categories', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }

    await deleteById('categories', id)
    res.status(204).end()
  } catch (error) {
    logger.error('categories.delete failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
