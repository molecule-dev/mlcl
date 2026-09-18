/**
 * Adapter helpers between the backend marketplace API shape (decimal
 * dollar prices, snake_case fields) and the React component shape
 * (cents-based prices, optional vendor pill props).
 *
 * Use these at the boundary so component props stay simple and
 * backend payload changes only require updating one file.
 *
 * @module
 */

import type { VendryProduct } from '../components/VendryProductCard.js'
import type { VendryVendor } from '../components/VendryVendorCard.js'

export interface ApiProduct {
  id: string
  name: string
  description?: string | null
  price?: string | number | null
  currency?: string | null
  images?: string[] | string | null
  thumbnails?: string[] | string | null
  category?: string | null
  status?: string | null
  rating?: string | number | null
  review_count?: number | null
  total_sold?: number | null
  vendor_id?: string | null
  vendor_name?: string | null
  vendor_slug?: string | null
  vendor_verified?: boolean | null
  slug?: string | null
}

export interface ApiVendor {
  id: string
  name?: string | null
  slug?: string | null
  description?: string | null
  logo?: string | null
  banner_url?: string | null
  rating?: string | number | null
  product_count?: number | null
  total_sales?: number | null
  featured?: boolean | null
}

/** Parse `images` whether it's a real array, JSON-stringified array, or a
 * plain URL string. The seed inserts JSON.stringify([...]) which the
 * postgres driver may surface as either a string or a parsed array
 * depending on the column type. */
export function firstImageUrl(images: ApiProduct['images']): string | undefined {
  if (Array.isArray(images) && images.length > 0) return String(images[0])
  if (typeof images === 'string' && images.length > 0) {
    try {
      const parsed = JSON.parse(images)
      if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0])
    } catch (_error) {
      // not valid JSON — treat the raw string as a direct image URL
      return images
    }
  }
  return undefined
}

export function dollarsToCents(value: ApiProduct['price']): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function productFromApi(p: ApiProduct): VendryProduct {
  return {
    id: p.id,
    name: p.name,
    price_cents: dollarsToCents(p.price),
    image_url: firstImageUrl(p.images),
    rating: p.rating != null ? Number(p.rating) : undefined,
    review_count: p.review_count ?? 0,
    vendor_id: p.vendor_id ?? undefined,
    vendor_name: p.vendor_name ?? undefined,
    vendor_slug: p.vendor_slug ?? undefined,
    vendor_verified: p.vendor_verified ?? undefined,
  }
}

export function vendorFromApi(v: ApiVendor): VendryVendor {
  return {
    id: v.id,
    slug: v.slug ?? '',
    name: v.name ?? 'Vendor',
    tagline: v.description ?? '',
    rating: v.rating != null ? Number(v.rating) : 0,
    product_count: v.product_count ?? 0,
    total_sales: v.total_sales ?? 0,
    verified: !!v.featured,
    featured: !!v.featured,
    location: '',
    avatar_url: v.logo ?? undefined,
    banner_url: v.banner_url ?? undefined,
  }
}
