/**
 * Cart endpoints for multi-vendor-marketplace.
 *
 * The frontend Cart page expects `GET /api/cart` to return a list of
 * cart_items grouped by vendor, with denormalized vendor info per group
 * (vendor_id, vendor_name, vendor_slug, vendor_verified, items[] with
 * product_id, name, image, unit_price, quantity).
 *
 * Endpoints:
 *   GET    /api/cart                  → grouped vendor breakdown
 *   POST   /api/cart                  → add item   { product_id, quantity, variant_id? }
 *   PUT    /api/cart/:id              → update qty { quantity }
 *   DELETE /api/cart/:id              → remove item
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { vendorIsActive } from '../lib/vendor-status.js'

const router = Router()

const addItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100).optional().default(1),
  variant_id: z.string().optional(),
})

const updateQtySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100),
})

interface ViewCartItem {
  id: string
  product_id: string
  variant_id: string | null
  name: string
  image: string | null
  unit_price_cents: number
  quantity: number
}

interface ViewCartGroup {
  vendor_id: string
  vendor_slug: string
  vendor_name: string
  vendor_verified: boolean
  shipping_cents: number
  estimated_delivery: string
  items: ViewCartItem[]
  subtotal_cents: number
}

const FLAT_RATE_SHIPPING_CENTS = 800
const ESTIMATED_DELIVERY = 'Ships in 2-5 business days'

function dollarsToCents(value: unknown): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0) {
    return String(images[0])
  }
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0])
    } catch (_error) {
      // not valid JSON — treat the raw string as a direct image URL
      return images || null
    }
  }
  return null
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('cart.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const items = await findMany<Record<string, unknown>>('cart_items', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 200,
  })

  const groupsByVendor = new Map<string, ViewCartGroup>()
  let itemSubtotalTotal = 0

  for (const item of items) {
    const product = item.product_id
      ? await findById<Record<string, unknown>>('products', String(item.product_id))
      : null
    const vendorId = product?.vendor_id ? String(product.vendor_id) : 'unknown'
    const vendor =
      vendorId !== 'unknown' ? await findById<Record<string, unknown>>('vendors', vendorId) : null

    const unitPriceCents = dollarsToCents(product?.price ?? item.unit_price)
    const qty = Number(item.quantity ?? 1)
    const lineSubtotal = unitPriceCents * qty
    itemSubtotalTotal += lineSubtotal

    if (!groupsByVendor.has(vendorId)) {
      groupsByVendor.set(vendorId, {
        vendor_id: vendorId,
        vendor_slug: vendor?.slug ? String(vendor.slug) : '',
        vendor_name: vendor?.name ? String(vendor.name) : 'Unknown vendor',
        vendor_verified: !!vendor?.featured,
        shipping_cents: FLAT_RATE_SHIPPING_CENTS,
        estimated_delivery: ESTIMATED_DELIVERY,
        items: [],
        subtotal_cents: 0,
      })
    }
    const group = groupsByVendor.get(vendorId)!
    group.items.push({
      id: String(item.id),
      product_id: String(item.product_id ?? ''),
      variant_id: item.variant_id ? String(item.variant_id) : null,
      name: product?.name ? String(product.name) : item.name ? String(item.name) : 'Item',
      image: firstImage(product?.images),
      unit_price_cents: unitPriceCents,
      quantity: qty,
    })
    group.subtotal_cents += lineSubtotal
  }

  const groups = [...groupsByVendor.values()]
  const shippingTotal = groups.reduce((s, g) => s + g.shipping_cents, 0)
  const totalCents = itemSubtotalTotal + shippingTotal

  res.json({
    groups,
    item_count: items.length,
    item_subtotal_cents: itemSubtotalTotal,
    shipping_total_cents: shippingTotal,
    total_cents: totalCents,
    currency: process.env.MARKETPLACE_CURRENCY || 'USD',
  })
})

router.post('/', validateBody(addItemSchema), async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('cart.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const { product_id, quantity, variant_id } = req.body as z.infer<typeof addItemSchema>

  const product = await findById<Record<string, unknown>>('products', product_id)
  if (!product || product.status !== 'active') {
    res.status(404).json({
      error: t('cart.productNotFound', undefined, { defaultValue: 'Product not available.' }),
    })
    return
  }
  // Block adding a product whose owning vendor is suspended/pending.
  const vendor = product.vendor_id
    ? await findById<Record<string, unknown>>('vendors', product.vendor_id as string)
    : null
  if (!vendorIsActive(product.vendor_id, vendor)) {
    res.status(404).json({
      error: t('cart.productNotFound', undefined, { defaultValue: 'Product not available.' }),
    })
    return
  }

  // Merge with existing cart_item for same product+variant if present
  const existing = await findOne<Record<string, unknown>>('cart_items', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'product_id', operator: '=', value: product_id },
    ...(variant_id ? ([{ field: 'variant_id', operator: '=', value: variant_id }] as const) : []),
  ])
  if (existing) {
    const newQty = Math.min(100, Number(existing.quantity ?? 0) + quantity)
    const updated = await updateById<Record<string, unknown>>('cart_items', String(existing.id), {
      quantity: newQty,
      updated_at: new Date().toISOString(),
    })
    res.status(200).json(updated.data)
    return
  }
  const created = await create<Record<string, unknown>>('cart_items', {
    user_id: userId,
    product_id,
    variant_id: variant_id ?? null,
    quantity,
    unit_price: product.price ?? 0,
    name: (product.name as string) ?? 'Item',
  })
  res.status(201).json(created.data)
})

router.put('/:id', validateBody(updateQtySchema), async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('cart.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const itemId = String(req.params.id)
  const item = await findById<Record<string, unknown>>('cart_items', itemId)
  if (!item || item.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('cart.itemNotFound', undefined, { defaultValue: 'Cart item not found.' }) })
    return
  }
  const { quantity } = req.body as z.infer<typeof updateQtySchema>
  const updated = await updateById<Record<string, unknown>>('cart_items', itemId, {
    quantity,
    updated_at: new Date().toISOString(),
  })
  res.json(updated.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('cart.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const itemId = String(req.params.id)
  const item = await findById<Record<string, unknown>>('cart_items', itemId)
  if (!item || item.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('cart.itemNotFound', undefined, { defaultValue: 'Cart item not found.' }) })
    return
  }
  await deleteById('cart_items', itemId)
  const remaining = await count('cart_items', [{ field: 'user_id', operator: '=', value: userId }])
  res.json({ removed: true, remaining })
})

export default router
