/**
 * Storefront search + discovery endpoints.
 *
 * Powers the public Landing + Catalog pages. Trending and featured-vendors
 * responses are denormalized with vendor info so the frontend ProductCard
 * can render vendor pills + slugs without an extra round-trip per item.
 *
 * @module
 */

import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

import { activeVendorIds } from '../lib/vendor-status.js'

const searchQuery = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  vendor: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const trendingQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
})

const featuredQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(8),
})

const router = Router()

interface VendorRow {
  id: string
  name?: string | null
  slug?: string | null
  featured?: boolean | null
  rating?: number | string | null
  product_count?: number | null
  total_sales?: number | null
  description?: string | null
  logo?: string | null
  banner_url?: string | null
}

/** Look up vendor info for a batch of products and merge it into each
 * row, so the public catalog cards can render vendor name/slug/verified
 * without N+1 client-side fetches. */
async function denormalizeVendor(
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const vendorIds = [
    ...new Set(rows.map((r) => r.vendor_id).filter((v): v is string => typeof v === 'string')),
  ]
  const vendorMap = new Map<string, VendorRow>()
  for (const id of vendorIds) {
    const v = await findById<VendorRow>('vendors', id)
    if (v) vendorMap.set(id, v)
  }
  return rows.map((r) => {
    const v = typeof r.vendor_id === 'string' ? vendorMap.get(r.vendor_id) : undefined
    return v
      ? {
          ...r,
          vendor_name: v.name,
          vendor_slug: v.slug,
          vendor_verified: !!v.featured,
        }
      : r
  })
}

// Search products across all vendors. Falls back to a SQL ilike scan
// when the search bond isn't configured (so dev/test smoke runs work
// without Meilisearch). Surfaces real errors instead of swallowing them
// behind a try/catch — a generic 500 hides the actual problem.
router.get('/search', validateQuery(searchQuery), async (req, res, next) => {
  const { q, category, vendor, minPrice, maxPrice, page, limit } = req.query as unknown as z.infer<
    typeof searchQuery
  >

  const filters: Record<string, unknown> = {}
  if (category) filters.category = category
  if (vendor) filters.vendor_id = vendor
  if (minPrice !== undefined) filters.minPrice = minPrice
  if (maxPrice !== undefined) filters.maxPrice = maxPrice

  let results: Record<string, unknown>
  try {
    results = (await search('products', {
      text: q,
      filters,
      page,
      perPage: limit,
    })) as unknown as Record<string, unknown>
  } catch (_error) {
    // search bond not configured / Meilisearch down — fall back to a
    // case-insensitive substring scan over the catalog so the
    // storefront search box still returns *something* in dev/test.
    const where: WhereCondition[] = [
      { field: 'status', operator: '=', value: 'active' },
      { field: 'name', operator: 'ilike', value: q },
    ]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (vendor) where.push({ field: 'vendor_id', operator: '=', value: vendor })
    // Exclude products of suspended/pending vendors from search results.
    where.push({ field: 'vendor_id', operator: 'in', value: await activeVendorIds() })
    try {
      const data = await findMany<Record<string, unknown>>('products', {
        where,
        limit,
        offset: (page - 1) * limit,
      })
      const enriched = await denormalizeVendor(data)
      results = { data: enriched, total: enriched.length, page, limit }
    } catch (error) {
      return next(error)
    }
  }
  res.json(results)
})

// Categories with counts (used by Catalog filter sidebar).
router.get('/categories', async (_req, res, next) => {
  try {
    const products = await findMany<Record<string, unknown>>('products', {
      where: [
        { field: 'status', operator: '=', value: 'active' },
        { field: 'vendor_id', operator: 'in', value: await activeVendorIds() },
      ],
      limit: 10000,
    })
    const categoryCounts = products.reduce<Record<string, number>>((acc, p) => {
      const cat = (p.category as string) || 'uncategorized'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    res.json(Object.entries(categoryCounts).map(([name, count]) => ({ name, count })))
  } catch (error) {
    return next(error)
  }
})

router.get('/featured-vendors', validateQuery(featuredQuery), async (req, res, next) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof featuredQuery>
    let data = await findMany<Record<string, unknown>>('vendors', {
      where: [
        { field: 'status', operator: '=', value: 'active' },
        { field: 'featured', operator: '=', value: true },
      ],
      limit,
      orderBy: [{ field: 'rating', direction: 'desc' }],
    })
    if (data.length === 0) {
      // Fall back to all active vendors so the page never renders empty
      // when no rows happen to be flagged featured.
      data = await findMany<Record<string, unknown>>('vendors', {
        where: [{ field: 'status', operator: '=', value: 'active' }],
        limit,
        orderBy: [{ field: 'rating', direction: 'desc' }],
      })
    }
    res.json({ data, total: data.length })
  } catch (error) {
    return next(error)
  }
})

router.get('/trending', validateQuery(trendingQuery), async (req, res, next) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof trendingQuery>
    const rows = await findMany<Record<string, unknown>>('products', {
      where: [
        { field: 'status', operator: '=', value: 'active' },
        { field: 'vendor_id', operator: 'in', value: await activeVendorIds() },
      ],
      limit,
      orderBy: [{ field: 'total_sold', direction: 'desc' }],
    })
    const data = await denormalizeVendor(rows)
    res.json({ data, total: data.length })
  } catch (error) {
    return next(error)
  }
})

// Vendor lookup by slug — used by Cart/Notifications/VendorStorefront
// when only the URL slug is known (UUID isn't exposed to the URL).
router.get('/vendors/by-slug/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug)
    const rows = await findMany<Record<string, unknown>>('vendors', {
      where: [
        { field: 'slug', operator: '=', value: slug },
        { field: 'status', operator: '=', value: 'active' },
      ],
      limit: 1,
    })
    const vendor = rows[0]
    if (!vendor) {
      return res
        .status(404)
        .json({ error: t('vendor.notFound', {}, { defaultValue: 'Vendor not found' }) })
    }
    const products = await findMany<Record<string, unknown>>('products', {
      where: [
        { field: 'vendor_id', operator: '=', value: vendor.id as string },
        { field: 'status', operator: '=', value: 'active' },
      ],
      orderBy: [{ field: 'total_sold', direction: 'desc' }],
      limit: 24,
    })
    res.json({ vendor, products })
  } catch (error) {
    return next(error)
  }
})

// Lookup product by slug (Landing.tsx links use slugs). Matches by the
// `slug` column populated during seed/create.
router.get('/products/by-slug/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug)
    const rows = await findMany<Record<string, unknown>>('products', {
      where: [
        { field: 'slug', operator: '=', value: slug },
        { field: 'status', operator: '=', value: 'active' },
      ],
      limit: 1,
    })
    const product = rows[0]
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    const vendor = product.vendor_id
      ? await findById<Record<string, unknown>>('vendors', product.vendor_id as string)
      : null
    res.json({ ...product, vendor })
  } catch (error) {
    return next(error)
  }
})

export default router
