import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().optional(),
})

const updateCategorySchema = createCategorySchema.extend({
  status: z.string().optional(),
})

// List active categories with active deal counts.
// Authorization: any authenticated user. Categories are a global taxonomy
// (not user_id scoped); admin role is required for write ops only.
router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
  const orderBy: OrderBy[] = [{ field: 'sort_order', direction: 'asc' }]
  const cats = await findMany<Record<string, unknown>>('categories', { where, orderBy, limit: 100 })

  const enriched = await Promise.all(
    cats.map(async (cat) => {
      const activeDeals = await count('deals', [
        { field: 'category_id', operator: '=', value: cat.id },
        { field: 'status', operator: '=', value: 'active' },
      ])
      return { ...cat, active_deals: activeDeals }
    }),
  )
  res.json(enriched)
})

// Get a single category. authSelf-style auth check ensures the request is
// authenticated; categories themselves are global, not per-user.
router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const cat = await findById('categories', getParamId(req))
  if (!cat) return res.status(404).json({ error: t('category.notFound') })
  res.json(cat)
})

// Get deals in a category.
router.get('/:id/deals', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: WhereCondition[] = [
    { field: 'category_id', operator: '=', value: getParamId(req) },
    { field: 'status', operator: '=', value: 'active' },
  ]
  const orderBy: OrderBy[] = [{ field: 'discount_percent', direction: 'desc' }]
  const items = await findMany('deals', { where, orderBy, limit: 50 })
  res.json(items)
})

// Admin: create category. The categories table is a global taxonomy with no
// per-user owner, so writes are gated by requireAdmin (role==='admin' or an
// ADMIN_EMAILS owner) — a bare authenticated session is not sufficient.
router.post(
  '/',
  requireAdmin,
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    const slug =
      (req.body.slug as string | undefined) ??
      (req.body.name as string).toLowerCase().replace(/\s+/g, '-')

    const result = await create('categories', {
      name: req.body.name,
      slug,
      description: req.body.description ?? null,
      icon: req.body.icon ?? null,
      sort_order: req.body.sort_order ?? 0,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  },
)

// Admin: update category. Gated by requireAdmin — the global categories
// taxonomy has no per-user owner, so authorization (not just authentication)
// is required to mutate it.
router.put(
  '/:id',
  requireAdmin,
  validateBody(updateCategorySchema),
  async (req: Request, res: Response) => {
    const id = getParamId(req)
    const existing = await findById('categories', id)
    if (!existing) return res.status(404).json({ error: t('category.notFound') })

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.slug !== undefined) updates.slug = req.body.slug
    if (req.body.description !== undefined) updates.description = req.body.description
    if (req.body.icon !== undefined) updates.icon = req.body.icon
    if (req.body.sort_order !== undefined) updates.sort_order = req.body.sort_order
    if (req.body.status !== undefined) updates.status = req.body.status

    const result = await updateById('categories', id, updates)
    res.json(result.data ?? result)
  },
)

// Admin: delete category. Gated by requireAdmin. Refuses if the category still
// has active deals.
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = getParamId(req)
  const existing = await findById('categories', id)
  if (!existing) return res.status(404).json({ error: t('category.notFound') })

  const activeCount = await count('deals', [
    { field: 'category_id', operator: '=', value: id },
    { field: 'status', operator: '=', value: 'active' },
  ])
  if (activeCount > 0) {
    return res.status(400).json({ error: t('category.hasActiveDeals') })
  }

  await deleteById('categories', id)
  res.status(204).end()
})

export default router
