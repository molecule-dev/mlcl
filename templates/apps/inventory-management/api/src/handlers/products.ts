import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
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
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { InventoryManagementLimits } from '../tiers.js'
import { seedDemoForUserSafe } from './_seed.js'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const statusEnum = z.enum(['active', 'archived'])

const listProductsQuery = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
  category: z.string().optional(),
  status: z.string().optional(),
})

const searchProductsQuery = z.object({
  q: z.string().min(1),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
})

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  cost_price: z.number().nonnegative().optional(),
  sell_price: z.number().nonnegative().optional(),
  description: z.string().optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unit: z.string().optional(),
  cost_price: z.number().nonnegative().optional(),
  sell_price: z.number().nonnegative().optional(),
  description: z.string().optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
  status: statusEnum.optional(),
})

// List products with pagination + filters (org-scoped via user_id)
router.get('/', validateQuery(listProductsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const { page, limit, category, status } = req.query as unknown as z.infer<
      typeof listProductsQuery
    >

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const products = await findMany('products', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(products)
  } catch (error) {
    console.error('Failed to list products', error)
    res
      .status(500)
      .json({ error: t('products.listFailed', {}, { defaultValue: 'Failed to list products' }) })
  }
})

// Search products by name / SKU / barcode (LIKE fallback — Meili can replace later)
router.get('/search', validateQuery(searchProductsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchProductsQuery>

    // Naive substring match on name (case-insensitive) — fallback before Meili wiring.
    const all = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const ql = String(q).toLowerCase()
    const filtered = all.filter((p) => {
      const name = String(p.name ?? '').toLowerCase()
      const sku = String(p.sku ?? '').toLowerCase()
      const barcode = String(p.barcode ?? '').toLowerCase()
      return name.includes(ql) || sku.includes(ql) || barcode.includes(ql)
    })
    const start = (Number(page) - 1) * Number(limit)
    res.json(filtered.slice(start, start + Number(limit)))
  } catch (error) {
    console.error('Failed to search products', error)
    res
      .status(500)
      .json({ error: t('products.searchFailed', {}, { defaultValue: 'Search failed' }) })
  }
})

// Get single product with stock summary (org-scoped)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const product = await findById('products', req.params.id as string)
    if (!product || product.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('products.notFound', {}, { defaultValue: 'Product not found' }) })
      return
    }

    const stockLevels = await findMany('stock_levels', {
      where: [{ field: 'product_id', operator: '=', value: req.params.id as string }],
    })

    res.json({ ...product, stock_levels: stockLevels })
  } catch (error) {
    console.error('Failed to get product', error)
    res
      .status(500)
      .json({ error: t('products.getFailed', {}, { defaultValue: 'Failed to get product' }) })
  }
})

// Create product (entitlement-gated by maxProducts; org-scoped via user_id)
router.post(
  '/',
  enforceLimit<InventoryManagementLimits>({
    limitType: 'maxProducts',
    getLimit: (limits) => limits.maxProducts,
    getCurrent: async (userId) =>
      count('products', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createProductSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createProductSchema>

      const existing = await findOne('products', [
        { field: 'sku', operator: '=', value: body.sku },
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existing) {
        res.status(409).json({
          error: t(
            'products.skuExists',
            {},
            { defaultValue: 'A product with this SKU already exists' },
          ),
        })
        return
      }

      const result = await create('products', {
        user_id: userId,
        name: body.name,
        sku: body.sku,
        barcode: body.barcode ?? null,
        category: body.category ?? null,
        unit: body.unit ?? 'each',
        cost_price: body.cost_price ?? 0,
        sell_price: body.sell_price ?? 0,
        description: body.description ?? '',
        low_stock_threshold: body.low_stock_threshold ?? 10,
        status: 'active',
      })

      res.status(201).json(result.data)
    } catch (error) {
      console.error('Failed to create product', error)
      res.status(500).json({
        error: t('products.createFailed', {}, { defaultValue: 'Failed to create product' }),
      })
    }
  },
)

// Update product (org-scoped)
router.put('/:id', validateBody(updateProductSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const existing = await findById('products', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('products.notFound', {}, { defaultValue: 'Product not found' }) })
      return
    }

    if (req.body.sku && req.body.sku !== existing.sku) {
      const dup = await findOne('products', [
        { field: 'sku', operator: '=', value: req.body.sku },
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (dup) {
        res.status(409).json({
          error: t(
            'products.skuExists',
            {},
            { defaultValue: 'A product with this SKU already exists' },
          ),
        })
        return
      }
    }

    const result = await updateById('products', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to update product', error)
    res
      .status(500)
      .json({ error: t('products.updateFailed', {}, { defaultValue: 'Failed to update product' }) })
  }
})

// Archive product (soft delete)
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const product = await findById('products', id)
    if (!product || product.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('products.notFound', {}, { defaultValue: 'Product not found' }) })
      return
    }

    const result = await updateById('products', id, {
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to archive product', error)
    res.status(500).json({
      error: t('products.archiveFailed', {}, { defaultValue: 'Failed to archive product' }),
    })
  }
})

// Delete product (hard delete, org-scoped)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const product = await findById('products', id)
    if (!product || product.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('products.notFound', {}, { defaultValue: 'Product not found' }) })
      return
    }

    await deleteById('products', id)
    res.status(204).end()
  } catch (error) {
    console.error('Failed to delete product', error)
    res
      .status(500)
      .json({ error: t('products.deleteFailed', {}, { defaultValue: 'Failed to delete product' }) })
  }
})

export default router
