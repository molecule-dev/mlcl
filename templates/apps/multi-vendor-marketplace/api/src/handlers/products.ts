import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { resize, thumbnail } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { deleteDocument, index } from '@molecule/api-search'

import { activeVendorIds, vendorIsActive } from '../lib/vendor-status.js'
import type { MultiVendorMarketplaceLimits } from '../tiers.js'

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  vendor: z.string().optional(),
  sort: z.string().optional().default('-created_at'),
})

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  price: z.number().nonnegative(),
  category: z.string().min(1),
  sku: z.string().optional(),
  variants: z.array(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  category: z.string().min(1).optional(),
  sku: z.string().optional(),
  variants: z.array(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).optional(),
})

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

router.get('/', validateQuery(listQuery), async (req, res) => {
  try {
    const { page, limit, category, vendor, sort } = req.query as unknown as z.infer<
      typeof listQuery
    >

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (vendor) where.push({ field: 'vendor_id', operator: '=', value: vendor })
    // Only serve products whose owning vendor is active — a suspended/pending vendor's catalog is
    // hidden from the storefront.
    where.push({ field: 'vendor_id', operator: 'in', value: await activeVendorIds() })

    const direction = sort.startsWith('-') ? ('desc' as const) : ('asc' as const)
    const field = sort.replace(/^-/, '')

    const [data, total] = await Promise.all([
      findMany<Record<string, unknown>>('products', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field, direction }],
      }),
      count('products', where),
    ])
    res.json({ data, total, page, limit })
  } catch (error) {
    logger.error('products.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const productId = String(req.params.id)
    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const vendor = product.vendor_id
      ? await findById<Record<string, unknown>>('vendors', product.vendor_id as string)
      : null
    // A suspended/pending vendor's product is not viewable (mirrors the catalog filter).
    if (!vendorIsActive(product.vendor_id, vendor)) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    const stock = await findOne<Record<string, unknown>>('inventory', [
      { field: 'product_id', operator: '=', value: productId },
    ])

    res.json({
      ...product,
      vendor,
      inventory: stock ? { available: stock.available ?? 0 } : { available: 0 },
    })
  } catch (error) {
    logger.error('products.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<MultiVendorMarketplaceLimits>({
    limitType: 'maxProducts',
    getLimit: (limits) => limits.maxProducts,
    getCurrent: async (userId) =>
      count('products', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as RequestHandler,
  validateBody(createProductSchema),
  async (req, res) => {
    try {
      const userId = res.locals.session?.userId as string
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      }

      const vendor = await findOne<Record<string, unknown>>('vendors', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ])
      if (!vendor) {
        return res
          .status(403)
          .json({ error: t('vendor.notActive', {}, { defaultValue: 'Vendor account not active' }) })
      }

      const { name, description, price, category, sku, variants, tags } = req.body as z.infer<
        typeof createProductSchema
      >

      const result = await create<Record<string, unknown>>('products', {
        user_id: userId,
        vendor_id: vendor.id as string,
        name,
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        description,
        // products.price is numeric(20,4) in dollars (matches the seed
        // catalog and the cart/order math in cart.ts/orders.ts that
        // converts dollars → cents on read). Do NOT multiply by 100
        // — that previously double-counted by 100x in the cart UI.
        price: Number(price),
        category,
        sku,
        variants: variants || [],
        tags: tags || [],
        images: [],
        thumbnails: [],
        status: 'active',
        featured: false,
        total_sold: 0,
        created_at: new Date().toISOString(),
      })

      if (result.data) {
        try {
          await index('products', result.data.id as string, result.data)
        } catch (_error) {
          // best-effort search index — search bond may not be configured
        }
      }
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('products.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateProductSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const productId = String(req.params.id)
    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    if (product.user_id !== userId) {
      const vendor = product.vendor_id
        ? await findById<Record<string, unknown>>('vendors', product.vendor_id as string)
        : null
      if (!vendor || vendor.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const body = req.body as z.infer<typeof updateProductSchema>
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.price !== undefined) updates.price = Number(body.price)
    if (body.category !== undefined) updates.category = body.category
    if (body.sku !== undefined) updates.sku = body.sku
    if (body.variants !== undefined) updates.variants = body.variants
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.status !== undefined) updates.status = body.status

    const result = await updateById<Record<string, unknown>>('products', productId, updates)
    if (result.data) {
      try {
        await index('products', productId, result.data)
      } catch (_error) {
        // best-effort search index — search bond may not be configured
      }
    }
    res.json(result.data)
  } catch (error) {
    logger.error('products.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/images', validateBody(productImageBodySchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const productId = String(req.params.id)
    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    if (product.user_id !== userId) {
      const vendor = product.vendor_id
        ? await findById<Record<string, unknown>>('vendors', product.vendor_id as string)
        : null
      if (!vendor || vendor.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      }
    }

    const imageBuffer = toImageBuffer(req.body.image as string | Buffer)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res
        .status(413)
        .json({ error: t('product.imageTooLarge', {}, { defaultValue: 'Image too large' }) })
    }

    const resized = await resize(imageBuffer, { width: 800, height: 800, fit: 'contain' })
    const thumb = await thumbnail(imageBuffer, 200)

    const imageUrl = `data:image/jpeg;base64,${resized.toString('base64')}`
    const thumbUrl = `data:image/jpeg;base64,${thumb.toString('base64')}`

    const images = [...((product.images as string[]) || []), imageUrl]
    const thumbnails = [...((product.thumbnails as string[]) || []), thumbUrl]

    const result = await updateById<Record<string, unknown>>('products', productId, {
      images,
      thumbnails,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('products.addImage', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const productId = String(req.params.id)
    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    if (product.user_id !== userId) {
      const vendor = product.vendor_id
        ? await findById<Record<string, unknown>>('vendors', product.vendor_id as string)
        : null
      if (!vendor || vendor.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      }
    }

    await updateById('products', productId, {
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    try {
      await deleteDocument('products', productId)
    } catch (_error) {
      // best-effort search removal — search bond may not be configured
    }
    res.status(204).send()
  } catch (error) {
    logger.error('products.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
