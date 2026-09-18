/**
 * Products handler — public list/detail + admin-only writes against the
 * GLOBAL `products` catalogue. Public reads are unauthenticated; every
 * mutation (create/update/soft-delete/hard-delete) is gated by `requireAdmin`
 * because the catalogue is shared across all customers — a valid session is NOT
 * sufficient. Only the designated store operator (`role === 'admin'` or an
 * `ADMIN_EMAILS` allow-list email) may write; ordinary shoppers get 403.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

interface ProductRow {
  id: string
  name: string
  brand: string | null
  category: string | null
  unit: string
  unit_size: string | null
  price: number
  currency: string
  description: string | null
  image_url: string | null
  organic: boolean
  attributes: Record<string, unknown> | null
  tags: unknown
  status: string
}

/**
 * Map a raw products row to the frontend-facing shape.
 *
 * The DB stores prices in cents on `price`, badges in `tags` (jsonb), and
 * unit-pricing/rating metadata in `attributes` (jsonb). The frontend
 * expects flat fields named `price_cents`, `thumbnail_url`, `size`,
 * `badges`, `rating`, `review_count`, `in_stock` etc., so we serialize
 * here rather than littering normalize calls across every page.
 */
function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch (_error) {
      // invalid JSON; return the caller-supplied fallback
      return fallback
    }
  }
  return raw as T
}

function serializeProduct(row: ProductRow): Record<string, unknown> {
  const attrs = parseJson<Record<string, unknown>>(row.attributes, {})
  const tagsRaw = parseJson<unknown>(row.tags, [])
  const tags = Array.isArray(tagsRaw) ? (tagsRaw as string[]) : []
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? '',
    category: row.category ?? 'all',
    size: row.unit_size ?? '',
    unit: row.unit,
    unit_label: typeof attrs.unit_label === 'string' ? attrs.unit_label : null,
    price_cents: Number(row.price),
    unit_price_cents: typeof attrs.unit_price_cents === 'number' ? attrs.unit_price_cents : null,
    currency: row.currency,
    description: row.description ?? null,
    thumbnail_url: row.image_url ?? null,
    organic: row.organic,
    badges: tags,
    rating: typeof attrs.rating === 'number' ? attrs.rating : null,
    review_count: typeof attrs.review_count === 'number' ? attrs.review_count : null,
    in_stock: row.status === 'active' && attrs.in_stock !== false,
    status: row.status,
  }
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(40),
  category: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'archived']).default('active'),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  unit: z.string().default('each'),
  unit_size: z.string().optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  organic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  status: z.enum(['active', 'archived']).default('active'),
})

const updateProductSchema = createProductSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, category, department, status } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'status', operator: '=', value: status },
    ]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (department) where.push({ field: 'department', operator: '=', value: department })

    const products = await findMany<ProductRow>('products', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: products.map(serializeProduct), page, limit })
  } catch (error) {
    logger.error('products.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, category, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    // Use `ilike` (case-insensitive contains) so 'milk' matches 'Whole Milk'.
    // The bond auto-wraps the value with `%…%` and escapes wildcards, so we
    // pass the bare query string here.
    const where: { field: string; operator: '=' | 'ilike'; value: unknown }[] = [
      { field: 'status', operator: '=', value: 'active' },
      { field: 'name', operator: 'ilike', value: q },
    ]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    const products = await findMany<ProductRow>('products', {
      where,
      limit,
    })
    res.json({ data: products.map(serializeProduct), q })
  } catch (error) {
    logger.error('products.search', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await findById<ProductRow>('products', getParamId(req))
    if (!product) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    res.json({ data: serializeProduct(product) })
  } catch (error) {
    logger.error('products.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createProductSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      const body = req.body as z.infer<typeof createProductSchema>
      const result = await create('products', {
        name: body.name,
        description: body.description ?? null,
        price: Math.round(body.price * 100),
        unit: body.unit,
        unit_size: body.unit_size ?? null,
        category: body.category ?? null,
        department: body.department ?? null,
        sku: body.sku ?? null,
        brand: body.brand ?? null,
        organic: body.organic,
        tags: body.tags,
        status: body.status,
        created_by: userId,
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('products.create', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateProductSchema),
  async (req: Request, res: Response) => {
    try {
      const existing = await findById<Record<string, unknown>>('products', getParamId(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateProductSchema>
      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.price !== undefined) updates.price = Math.round(body.price * 100)
      if (body.unit !== undefined) updates.unit = body.unit
      if (body.unit_size !== undefined) updates.unit_size = body.unit_size
      if (body.category !== undefined) updates.category = body.category
      if (body.department !== undefined) updates.department = body.department
      if (body.sku !== undefined) updates.sku = body.sku
      if (body.brand !== undefined) updates.brand = body.brand
      if (body.organic !== undefined) updates.organic = body.organic
      if (body.tags !== undefined) updates.tags = body.tags
      if (body.status !== undefined) updates.status = body.status
      updates.updated_at = new Date()

      const result = await updateById('products', getParamId(req), updates)
      res.json(result.data)
    } catch (error) {
      logger.error('products.update', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await findById('products', getParamId(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    await updateById('products', getParamId(req), { status: 'archived' })
    res.status(204).end()
  } catch (error) {
    logger.error('products.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Hard-delete (admin tooling). Kept separate from the soft-delete above so
// the canonical DELETE :id remains reversible.
router.delete('/:id/hard', requireAdmin, async (req: Request, res: Response) => {
  try {
    await deleteById('products', getParamId(req))
    res.status(204).end()
  } catch (error) {
    logger.error('products.hardDelete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
