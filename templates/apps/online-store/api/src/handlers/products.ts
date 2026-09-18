import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { resize, thumbnail } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { deleteDocument, index } from '@molecule/api-search'

import { requireAdmin } from '../middleware/require-admin.js'
import type { OnlineStoreLimits } from '../tiers.js'

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  price: z.number().positive(),
  category: z.string().min(1),
  sku: z.string().optional(),
  variants: z.array(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
})

const inventoryAdjustSchema = z.object({
  quantity: z.number().int(),
  reason: z.string().optional(),
})

/** Raw base64 or data-URL; optional Buffer when using a binary body parser. */
const MAX_IMAGE_BASE64_CHARS = 12_000_000

const productImageBodySchema = z.object({
  image: z.union([
    z.string().min(1).max(MAX_IMAGE_BASE64_CHARS),
    z.custom<Buffer>((v): v is Buffer => Buffer.isBuffer(v)),
  ]),
})

function toImageBuffer(image: string | Buffer): Buffer {
  if (Buffer.isBuffer(image)) return image
  const s = image.trim()
  const dataUrl = /^data:[^;]+;base64,(.+)$/i.exec(s)
  if (dataUrl) return Buffer.from(dataUrl[1], 'base64')
  return Buffer.from(s, 'base64')
}

const router = Router()

// List products with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const { category, minPrice, maxPrice, sort } = req.query

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (category) where.push({ field: 'category', operator: '=', value: String(category) })
    if (minPrice) where.push({ field: 'price', operator: '>=', value: Number(minPrice) })
    if (maxPrice) where.push({ field: 'price', operator: '<=', value: Number(maxPrice) })

    const sortField = String(sort || 'created_at')
    const direction = sortField.startsWith('-') ? ('desc' as const) : ('asc' as const)
    const field = sortField.replace(/^-/, '')

    const [products, total] = await Promise.all([
      findMany<Record<string, unknown>>('products', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field, direction }],
      }),
      count('products', where),
    ])
    res.json({ data: products, total, page, limit })
  } catch (error) {
    logger.error('products.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get single product with inventory status
router.get('/:id', async (req, res) => {
  try {
    const product = await findById<Record<string, unknown>>('products', req.params.id)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const stock = await findOne<Record<string, unknown>>('inventory', [
      { field: 'product_id', operator: '=', value: req.params.id },
    ])
    res.json({
      ...product,
      inventory: stock ? { available: stock.available ?? 0 } : { available: 0 },
    })
  } catch (error) {
    logger.error('products.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create product (admin)
router.post(
  '/',
  requireAdmin,
  enforceLimit<OnlineStoreLimits>({
    limitType: 'maxProducts',
    getLimit: (limits) => limits.maxProducts,
    getCurrent: async (userId) =>
      count('products', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as RequestHandler,
  validateBody(createProductSchema),
  async (req, res) => {
    try {
      const { name, description, price, category, sku, variants, tags } = req.body

      const result = await create<Record<string, unknown>>('products', {
        // Attribute the product to the creating admin: enforceLimit's
        // maxProducts gate counts `products WHERE user_id = <caller>`, so
        // omitting user_id here meant API-created products NEVER counted
        // toward the tier cap (rows landed with NULL user_id and the gate
        // could not trip organically).
        user_id: res.locals.session?.userId,
        name,
        description,
        price: Math.round(Number(price) * 100),
        category,
        sku,
        variants: JSON.stringify(variants || []),
        tags: JSON.stringify(tags || []),
        images: JSON.stringify([]),
        thumbnails: JSON.stringify([]),
        status: 'active',
        featured: false,
        total_sold: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (result.data) {
        // Search indexing is best-effort: a missing / unreachable MeiliSearch
        // bond must not fail product creation. The catalogue is the source of
        // truth; the search index is a derived view that can be backfilled.
        try {
          await index('products', result.data.id as string, result.data)
        } catch (_error) {
          // Best-effort search indexing — catalogue is the source of truth; index is a derived view
        }
      }
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('products.createProduct', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update product (admin)
router.put('/:id', requireAdmin, validateBody(updateProductSchema), async (req, res) => {
  try {
    const { name, description, price, category, sku, variants, tags, status } = req.body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (price !== undefined) updates.price = Math.round(Number(price) * 100)
    if (category !== undefined) updates.category = category
    if (sku !== undefined) updates.sku = sku
    if (variants !== undefined) updates.variants = JSON.stringify(variants)
    if (tags !== undefined) updates.tags = JSON.stringify(tags)
    if (status !== undefined) updates.status = status

    const id = req.params.id as string
    const result = await updateById<Record<string, unknown>>('products', id, updates)
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    try {
      await index('products', id, result.data)
    } catch (_error) {
      // Best-effort search indexing — catalogue is the source of truth; index is a derived view
    }
    res.json(result.data)
  } catch (error) {
    logger.error('products.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Upload product image
router.post('/:id/images', requireAdmin, validateBody(productImageBodySchema), async (req, res) => {
  try {
    const id = String(req.params.id)
    const product = await findById<Record<string, unknown>>('products', id)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const imageBuffer = toImageBuffer(req.body.image as string | Buffer)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res
        .status(413)
        .json({ error: t('product.imageTooLarge', {}, { defaultValue: 'Image too large' }) })
    }

    const resized = await resize(imageBuffer, { width: 800, height: 800, fit: 'contain' })
    const thumb = await thumbnail(imageBuffer, 200)

    // In production, upload to S3 via @molecule/api-uploads provider
    // For now, store as base64 data URLs
    const imageUrl = `data:image/jpeg;base64,${resized.toString('base64')}`
    const thumbUrl = `data:image/jpeg;base64,${thumb.toString('base64')}`

    const images = [...((product.images as string[]) || []), imageUrl]
    const thumbnails = [...((product.thumbnails as string[]) || []), thumbUrl]

    const result = await updateById<Record<string, unknown>>('products', id, {
      images: JSON.stringify(images),
      thumbnails: JSON.stringify(thumbnails),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('products.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete product (soft delete / archive)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id)
    const product = await findById('products', id)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    await updateById('products', id, {
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    try {
      await deleteDocument('products', id)
    } catch (_error) {
      // Best-effort search de-index — catalogue is the source of truth; index is a derived view
    }
    res.status(204).send()
  } catch (error) {
    logger.error('products.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Adjust inventory (admin)
router.post(
  '/:id/inventory',
  requireAdmin,
  validateBody(inventoryAdjustSchema),
  async (req, res) => {
    try {
      const { quantity, reason } = req.body
      const stock = await findOne<Record<string, unknown>>('inventory', [
        { field: 'product_id', operator: '=', value: req.params.id },
      ])

      if (!stock) {
        const result = await create<Record<string, unknown>>('inventory', {
          product_id: req.params.id,
          available: Number(quantity),
          reserved: 0,
          reason: String(reason || 'initial'),
          updated_at: new Date().toISOString(),
        })
        return res.json(result.data)
      }

      const newQty = (stock.available as number) + Number(quantity)
      const result = await updateById<Record<string, unknown>>('inventory', stock.id as string, {
        available: Math.max(0, newQty),
        reason: String(reason || 'adjustment'),
        updated_at: new Date().toISOString(),
      })
      res.json(result.data)
    } catch (error) {
      logger.error('products.handler', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
