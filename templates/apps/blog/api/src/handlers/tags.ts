import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(100),
})

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
  description: z.string().max(2000).optional(),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(7).optional(),
  description: z.string().max(2000).optional(),
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

// The tag taxonomy is a shared, author-managed resource: the /tags page is a
// self-service tag manager where any authenticated author can create, rename,
// recolor, and delete tags used across their posts. Write routes therefore
// require authentication only (401 when signed out) — they are NOT gated behind
// a moderator/admin role. Reads stay fully public via the GET routes.

// List all tags (public — used to populate filters and editors).
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const tags = await findMany('tags', {
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const total = await count('tags', [])
    res.json({ data: tags, total, page, limit })
  } catch (error) {
    logger.error('tags.list failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get tag by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tag = await findById('tags', getParamId(req))
    if (!tag) {
      res.status(404).json({ error: t('tags.notFound', {}, { defaultValue: 'Tag not found' }) })
      return
    }
    res.json(tag)
  } catch (error) {
    logger.error('tags.getById failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create tag (auth required)
router.post('/', validateBody(createTagSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { name, color, description } = req.body
    const now = new Date().toISOString()
    const slug = generateSlug(name)
    const result = await create('tags', {
      name,
      slug,
      color: color ?? null,
      description: description ?? null,
      createdAt: now,
      updatedAt: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('tags.create failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update tag (auth required)
router.patch('/:id', validateBody(updateTagSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById('tags', id)
    if (!existing) {
      res.status(404).json({ error: t('tags.notFound', {}, { defaultValue: 'Tag not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updatedAt: new Date().toISOString() }
    if (req.body.name) updates.slug = generateSlug(req.body.name)
    const result = await updateById('tags', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('tags.update failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete tag (auth required)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById('tags', id)
    if (!existing) {
      res.status(404).json({ error: t('tags.notFound', {}, { defaultValue: 'Tag not found' }) })
      return
    }
    await deleteById('tags', id)
    res.status(204).end()
  } catch (error) {
    logger.error('tags.delete failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
