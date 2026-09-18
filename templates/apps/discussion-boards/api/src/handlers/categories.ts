import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  parent_id: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
})

const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().optional().default(''),
  color: z.string().optional().default('#0088cc'),
  icon: z.string().optional().default(''),
  sort_order: z.number().int().optional().default(0),
  parent_id: z.string().optional().nullable(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().int().optional(),
  parent_id: z.string().nullable().optional(),
})

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getUserRole(res: Response): Promise<string> {
  const session = res.locals.session as { userId?: string } | undefined
  if (!session?.userId) return 'member'
  const user = (await findById('users', session.userId)) as { role?: string } | null
  return user?.role ?? 'member'
}

async function isAdmin(res: Response): Promise<boolean> {
  const role = await getUserRole(res)
  return role === 'admin' || role === 'moderator'
}

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { parent_id, limit, offset } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (parent_id) where.push({ field: 'parent_id', operator: '=', value: parent_id })
    const categories = await findMany('categories', {
      where: where.length ? where : undefined,
      limit,
      offset,
      orderBy: [
        { field: 'sort_order', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    })
    res.json(categories)
  } catch (error) {
    logger.error('categories.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const rows = await findMany('categories', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    const category = rows[0]
    if (!category) {
      res
        .status(404)
        .json({ error: t('categories.notFound', {}, { defaultValue: 'Category not found' }) })
      return
    }
    res.json(category)
  } catch (error) {
    logger.error('categories.getBySlug', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

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
    logger.error('categories.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Categories: admin / moderator-only writes (per INVENTORY authorization rules).
router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isAdmin(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const body = req.body as z.infer<typeof createCategorySchema>
    const slug = body.slug ?? generateSlug(body.name)
    const now = new Date().toISOString()
    const result = await create('categories', {
      name: body.name,
      slug,
      description: body.description,
      color: body.color,
      icon: body.icon,
      sort_order: body.sort_order,
      parent_id: body.parent_id ?? null,
      created_at: now,
      updated_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('categories.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isAdmin(res))) {
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
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if (req.body.name && !req.body.slug) updates.slug = generateSlug(req.body.name)
    const result = await updateById('categories', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('categories.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isAdmin(res))) {
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
    // Prevent orphaning topics — count first.
    const linkedCount = await count('topics', [{ field: 'category_id', operator: '=', value: id }])
    if (linkedCount > 0) {
      res.status(409).json({
        error: t('categories.notEmpty', {}, { defaultValue: 'Category still has topics' }),
      })
      return
    }
    await deleteById('categories', id)
    res.status(204).end()
  } catch (error) {
    logger.error('categories.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
