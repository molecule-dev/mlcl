/**
 * Products handler — seller-side CRUD over the `products` table plus
 * public list/detail. All by-id ownership is enforced via `creator_id`.
 *
 * The DB stores price as bigint cents (`price`); the storefront UI
 * speaks `price_cents`. Translate on read so the polished UI keeps
 * working without a schema rewrite. Slug-or-id lookup so the FE can
 * use either.
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { DigitalGoodsStoreLimits } from '../tiers.js'

const router = Router()

/** UUID v4 shape — used to decide if a route param is an id vs a slug. */
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'bigint') return Number(v)
  if (v == null) return 0
  return Number(v)
}

/** Translate DB row → FE shape. Centralized so list/detail/create/update agree. */
function toApiProduct(row: Record<string, unknown>): Record<string, unknown> {
  const price = toNum(row.price)
  const original = toNum((row as Record<string, unknown>).original_price)
  const sales = toNum(row.total_sales)
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price_cents: price,
    original_price_cents: original > 0 ? original : undefined,
    pricing_model: price === 0 ? 'free' : 'paid',
    file_type: row.file_type,
    file_url: row.file_url,
    file_name: row.file_name,
    file_size: toNum(row.file_size) || undefined,
    cover_image: row.cover_image ?? row.imageUrl ?? null,
    preview_url: row.preview_url ?? null,
    category: row.category,
    tags: row.tags ?? [],
    total_sales: sales,
    creator_id: row.creator_id,
    status: row.status,
    currency: row.currency ?? 'USD',
    updated_at: row.updated_at ?? row.updatedAt,
    created_at: row.created_at ?? row.createdAt,
  }
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  category: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  /** When `true`, the response is scoped to the authenticated user's
   *  own products (used by the seller's "Your products" page). */
  mine: z.preprocess(
    (v) => (v === 'true' || v === true ? true : v === 'false' || v === false ? false : undefined),
    z.boolean().optional(),
  ),
})

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  // The FE sends `price_cents` directly (integer cents). Accept either
  // for back-compat; coerce to bigint cents on store.
  price: z.number().nonnegative().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().default('USD'),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  // Accept null/empty for url fields — the editor sends null when the
  // field is blank rather than omitting it.
  file_url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  file_size: z.number().int().nonnegative().optional(),
  file_type: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  preview_url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  cover_image: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
})

const updateProductSchema = createProductSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, category, status, mine } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: { field: string; operator: '='; value: unknown }[] = []
    if (mine) {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      where.push({ field: 'creator_id', operator: '=', value: userId })
      // Sellers see drafts + archived too; default to all statuses unless filtered.
      if (status) where.push({ field: 'status', operator: '=', value: status })
    } else {
      where.push({ field: 'status', operator: '=', value: status ?? 'active' })
    }
    if (category) where.push({ field: 'category', operator: '=', value: category })

    const products = await findMany<Record<string, unknown>>('products', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: products.map(toApiProduct), page, limit })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const param = getParamId(req)
    let product: Record<string, unknown> | null = null
    if (UUID_RX.test(param)) {
      product = await findById<Record<string, unknown>>('products', param)
    } else {
      const matches = await findMany<Record<string, unknown>>('products', {
        where: [{ field: 'slug', operator: '=', value: param }],
        limit: 1,
      })
      product = matches[0] ?? null
    }
    if (!product) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    res.json(toApiProduct(product))
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier product cap (tiers.ts maxProducts) — defined + advertised in CATALOG but
// enforceLimit was never called, so any tier could create unlimited products.
const enforceProductLimit = enforceLimit<DigitalGoodsStoreLimits>({
  limitType: 'maxProducts',
  getLimit: (limits) => limits.maxProducts,
  getCurrent: async (userId) =>
    count('products', [{ field: 'creator_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceProductLimit,
  validateBody(createProductSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const body = req.body as z.infer<typeof createProductSchema>
      const slugFromName = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const baseSlug = body.slug ?? (slugFromName || 'product')
      // Slugs must be unique. Append a short random suffix on collision so
      // a creator can publish multiple products with similar names.
      let slug = baseSlug
      let attempts = 0
      while (attempts < 5) {
        const existing = await findMany<Record<string, unknown>>('products', {
          where: [{ field: 'slug', operator: '=', value: slug }],
          limit: 1,
        })
        if (existing.length === 0) break
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        attempts += 1
      }
      const priceCents =
        body.price_cents != null ? body.price_cents : Math.round((body.price ?? 0) * 100)
      const result = await create('products', {
        creator_id: userId,
        name: body.name,
        slug,
        description: body.description ?? null,
        price: priceCents,
        currency: body.currency,
        category: body.category ?? null,
        tags: body.tags ?? [],
        file_url: body.file_url ?? null,
        file_size: body.file_size ?? null,
        file_type: body.file_type ?? null,
        file_name: body.file_name ?? null,
        preview_url: body.preview_url ?? null,
        cover_image: body.cover_image ?? null,
        status: body.status,
        total_sales: 0,
        total_revenue: 0,
      })
      res.status(201).json(toApiProduct(result.data as Record<string, unknown>))
    } catch (err) {
      logger.error(err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateProductSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('products', getParamId(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    if (existing.creator_id !== userId) {
      res
        .status(403)
        .json({ error: t('product.unauthorized', undefined, { defaultValue: 'Not authorized' }) })
      return
    }
    const body = req.body as z.infer<typeof updateProductSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.description !== undefined) updates.description = body.description
    if (body.price !== undefined) updates.price = Math.round(body.price * 100)
    if (body.price_cents !== undefined) updates.price = body.price_cents
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.category !== undefined) updates.category = body.category
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.file_url !== undefined) updates.file_url = body.file_url
    if (body.file_size !== undefined) updates.file_size = body.file_size
    if (body.file_type !== undefined) updates.file_type = body.file_type
    if (body.file_name !== undefined) updates.file_name = body.file_name
    if (body.preview_url !== undefined) updates.preview_url = body.preview_url
    if (body.cover_image !== undefined) updates.cover_image = body.cover_image
    if (body.status !== undefined) updates.status = body.status
    updates.updated_at = new Date()

    const result = await updateById('products', getParamId(req), updates)
    res.json(toApiProduct(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('products', getParamId(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    if (existing.creator_id !== userId) {
      res
        .status(403)
        .json({ error: t('product.unauthorized', undefined, { defaultValue: 'Not authorized' }) })
      return
    }
    await deleteById('products', getParamId(req))
    res.status(204).end()
  } catch (err) {
    logger.error('products.delete', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
