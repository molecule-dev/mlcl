/**
 * Projection helpers — convert DB rows into the shapes the frontend
 * consumes. The frontend pages were authored against fixture JSONs
 * (api/fixtures/*.json) that use camel/snake-cased view-friendly fields
 * like `discount_pct`, `deal_price_cents`, `merchant` (string), etc.
 * The DB rows store the raw normalized columns (`discount_percent`,
 * `discounted_price`, `merchant_id`, etc.), so every handler decorates
 * its response through these helpers before serializing.
 *
 * Keeping projection in one place avoids drift across handlers and
 * makes it obvious where the API contract lives.
 *
 * @module
 */

import { findById, findMany } from '@molecule/api-database'

export interface ViewDeal {
  id: string
  title: string
  merchant: string
  merchant_id: string
  category: string
  category_id: string | null
  description: string
  fine_print: string[]
  discount_pct: number
  original_price_cents: number
  deal_price_cents: number
  expires_at: string | null
  starts_at: string | null
  hot: boolean
  saved_count: number
  redemption_code: string
  qr_url: string
  redeemed: boolean
  saved: boolean
}

export interface ViewMerchant {
  id: string
  name: string
  category: string
  city: string
  rating: number
  active_deals: number
  initial: string
  bio: string
  hours: { day: string; open: string; close: string }[]
  address: string
  phone: string
}

export interface ViewCoupon {
  id: string
  deal_id: string
  title: string
  merchant: string
  merchant_id: string
  redemption_code: string
  discount_pct: number
  deal_price_cents: number
  status: 'active' | 'redeemed' | 'expired'
  saved_at: string
  expires_at: string
  redeemed_at: string | null
}

export interface ViewNearbyDeal {
  id: string
  title: string
  merchant: string
  merchant_id: string
  discount_pct: number
  deal_price_cents: number
  distance_km: number
  expires_at: string
  lat: number | null
  lng: number | null
  hot: boolean
}

export interface ViewNotification {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  entity_id: string | null
  created_at: string
  unread: boolean
}

const DEFAULT_HOURS = [
  { day: 'Mon', open: '9:00', close: '18:00' },
  { day: 'Tue', open: '9:00', close: '18:00' },
  { day: 'Wed', open: '9:00', close: '18:00' },
  { day: 'Thu', open: '9:00', close: '18:00' },
  { day: 'Fri', open: '9:00', close: '18:00' },
  { day: 'Sat', open: '10:00', close: '17:00' },
  { day: 'Sun', open: '10:00', close: '16:00' },
]

const DEFAULT_FINE_PRINT = ['Cannot combine with other promotions.', 'Subject to availability.']

function asISO(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function pickInitial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase()
}

function categoryGuess(merchant: Record<string, unknown> | null): string {
  if (!merchant) return 'Local'
  const desc = String(merchant.business_description ?? '').toLowerCase()
  if (/restaurant|brunch|cafe|pizza|coffee|food/.test(desc)) return 'Restaurants'
  if (/spa|salon|beauty|massage|hair/.test(desc)) return 'Beauty'
  if (/gym|fitness|yoga|climb|crossfit/.test(desc)) return 'Fitness'
  if (/online|store|shop|ecommerce/.test(desc)) return 'Online'
  if (/clean|repair|service/.test(desc)) return 'Services'
  return 'Activities'
}

function cityFromAddress(address: string | null | undefined): string {
  if (!address) return ''
  const parts = String(address)
    .split(',')
    .map((p) => p.trim())
  if (parts.length >= 2) return parts.slice(-2).join(', ').slice(0, 60)
  return parts[0] || ''
}

export interface DealDecorateContext {
  /** Userland viewer (used to resolve saved/redeemed state per deal). */
  userId?: string | null
}

export async function decorateDeal(
  deal: Record<string, unknown>,
  ctx: DealDecorateContext = {},
): Promise<ViewDeal> {
  const merchant = deal.merchant_id
    ? await findById<Record<string, unknown>>('merchants', String(deal.merchant_id))
    : null
  const category = deal.category_id
    ? await findById<Record<string, unknown>>('categories', String(deal.category_id))
    : null

  const savedCount = await import('@molecule/api-database').then(({ count }) =>
    count('redemptions', [{ field: 'deal_id', operator: '=', value: String(deal.id) }]),
  )

  let saved = false
  let redeemed = false
  let redemptionCode = String(deal.id).slice(0, 8).toUpperCase()
  if (ctx.userId) {
    const myRedemption = await import('@molecule/api-database').then(({ findOne }) =>
      findOne<Record<string, unknown>>('redemptions', [
        { field: 'user_id', operator: '=', value: ctx.userId as string },
        { field: 'deal_id', operator: '=', value: String(deal.id) },
      ]),
    )
    if (myRedemption) {
      saved = true
      redeemed = myRedemption.status === 'redeemed'
      if (myRedemption.code) redemptionCode = String(myRedemption.code)
    }
  }

  const finePrintRaw = deal.terms ?? null
  const fine_print = finePrintRaw
    ? String(finePrintRaw)
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
    : DEFAULT_FINE_PRINT

  return {
    id: String(deal.id),
    title: String(deal.title ?? ''),
    merchant: merchant?.business_name ? String(merchant.business_name) : '',
    merchant_id: String(deal.merchant_id ?? ''),
    category: category?.name ? String(category.name) : categoryGuess(merchant),
    category_id: deal.category_id ? String(deal.category_id) : null,
    description: String(deal.description ?? ''),
    fine_print,
    discount_pct: Number(deal.discount_percent ?? 0),
    original_price_cents: Number(deal.original_price ?? 0),
    deal_price_cents: Number(deal.discounted_price ?? 0),
    expires_at: asISO(deal.expires_at),
    starts_at: asISO(deal.starts_at),
    hot: !!deal.featured,
    saved_count: savedCount,
    redemption_code: redemptionCode,
    qr_url: `/qr/${String(deal.id)}.png`,
    redeemed,
    saved,
  }
}

export async function decorateDeals(
  rows: Record<string, unknown>[],
  ctx: DealDecorateContext = {},
): Promise<ViewDeal[]> {
  return Promise.all(rows.map((row) => decorateDeal(row, ctx)))
}

export async function decorateMerchant(merchant: Record<string, unknown>): Promise<ViewMerchant> {
  const merchantId = String(merchant.id)
  const activeDeals = await import('@molecule/api-database').then(({ count }) =>
    count('deals', [
      { field: 'merchant_id', operator: '=', value: merchantId },
      { field: 'status', operator: '=', value: 'active' },
    ]),
  )

  const name = String(merchant.business_name ?? '')
  const address = merchant.address ? String(merchant.address) : ''
  return {
    id: merchantId,
    name,
    category: categoryGuess(merchant),
    city: cityFromAddress(address),
    rating: Number(merchant.rating ?? 0),
    active_deals: activeDeals,
    initial: pickInitial(name),
    bio: merchant.business_description ? String(merchant.business_description) : '',
    hours: DEFAULT_HOURS,
    address,
    phone: merchant.contact_phone ? String(merchant.contact_phone) : '',
  }
}

export async function decorateMerchants(rows: Record<string, unknown>[]): Promise<ViewMerchant[]> {
  return Promise.all(rows.map((m) => decorateMerchant(m)))
}

export async function decorateCoupon(coupon: Record<string, unknown>): Promise<ViewCoupon> {
  const deal = coupon.deal_id
    ? await findById<Record<string, unknown>>('deals', String(coupon.deal_id))
    : null
  const merchant = coupon.merchant_id
    ? await findById<Record<string, unknown>>('merchants', String(coupon.merchant_id))
    : null

  const status = String(coupon.status ?? 'active')
  const expiresAt = asISO(deal?.expires_at) ?? new Date(Date.now() + 86_400_000).toISOString()
  const usedAt = asISO(coupon.used_at)
  const computedStatus: 'active' | 'redeemed' | 'expired' = usedAt
    ? 'redeemed'
    : status === 'redeemed'
      ? 'redeemed'
      : new Date(expiresAt).getTime() < Date.now()
        ? 'expired'
        : 'active'

  return {
    id: String(coupon.id),
    deal_id: String(coupon.deal_id ?? ''),
    title: deal?.title ? String(deal.title) : 'Coupon',
    merchant: merchant?.business_name ? String(merchant.business_name) : '',
    merchant_id: String(coupon.merchant_id ?? ''),
    redemption_code: String(coupon.code ?? ''),
    discount_pct: Number(deal?.discount_percent ?? 0),
    deal_price_cents: Number(deal?.discounted_price ?? 0),
    status: computedStatus,
    saved_at: asISO(coupon.saved_at) ?? new Date().toISOString(),
    expires_at: expiresAt,
    redeemed_at: usedAt,
  }
}

export async function decorateCoupons(rows: Record<string, unknown>[]): Promise<ViewCoupon[]> {
  return Promise.all(rows.map((c) => decorateCoupon(c)))
}

export async function decorateNotification(n: Record<string, unknown>): Promise<ViewNotification> {
  return {
    id: String(n.id),
    type: String(n.type ?? 'system_message'),
    title: String(n.title ?? ''),
    body: n.body ? String(n.body) : null,
    href: n.href ? String(n.href) : null,
    entity_id: n.entity_id ? String(n.entity_id) : null,
    created_at: asISO(n.created_at) ?? new Date().toISOString(),
    unread: !!n.unread,
  }
}

/**
 * Compute synthetic distances for nearby deals when the row doesn't
 * have one (e.g. seeded set without geo). Falls back to a deterministic
 * pseudo-distance based on the deal id so the UI can render an order.
 */
function fallbackDistance(dealId: string): number {
  let h = 0
  for (let i = 0; i < dealId.length; i++) h = (h * 31 + dealId.charCodeAt(i)) >>> 0
  return Number(((h % 4900) / 1000 + 0.1).toFixed(2))
}

/** Preference-derived scoping for the nearby-deals feed. */
export interface NearbyFilter {
  /** Drop deals farther than this many km. `null`/undefined = no cap. */
  radiusKm?: number | null
  /** Keep only deals whose `category_id` is in this set. Empty/undefined = no category filter. */
  categoryIds?: readonly string[]
  /** Maximum results to return after filtering (default 25). */
  limit?: number
}

export async function decorateNearbyDeals(
  rows: Record<string, unknown>[],
  filter: NearbyFilter = {},
): Promise<ViewNearbyDeal[]> {
  const radiusKm = filter.radiusKm ?? null
  const categorySet =
    filter.categoryIds && filter.categoryIds.length > 0 ? new Set(filter.categoryIds) : null
  const limit = filter.limit && filter.limit > 0 ? filter.limit : 25

  const withinRadius = (distanceKm: number): boolean => radiusKm == null || distanceKm <= radiusKm
  const inCategory = (categoryId: string | null): boolean =>
    !categorySet || (categoryId != null && categorySet.has(categoryId))

  if (rows.length > 0) {
    const out: ViewNearbyDeal[] = []
    for (const n of rows) {
      if (out.length >= limit) break
      const deal = n.deal_id
        ? await findById<Record<string, unknown>>('deals', String(n.deal_id))
        : null
      const dealId = String(n.deal_id ?? n.id)
      const distanceKm = Number(n.distance_km ?? fallbackDistance(dealId))
      const categoryId = deal?.category_id != null ? String(deal.category_id) : null
      if (!withinRadius(distanceKm) || !inCategory(categoryId)) continue
      const merchant = n.merchant_id
        ? await findById<Record<string, unknown>>('merchants', String(n.merchant_id))
        : null
      out.push({
        id: dealId,
        title: deal?.title ? String(deal.title) : String(n.title ?? 'Nearby deal'),
        merchant: merchant?.business_name ? String(merchant.business_name) : '',
        merchant_id: String(n.merchant_id ?? ''),
        discount_pct: Number(n.discount_percent ?? deal?.discount_percent ?? 0),
        deal_price_cents: Number(deal?.discounted_price ?? 0),
        distance_km: distanceKm,
        expires_at: asISO(n.expires_at) ?? new Date(Date.now() + 86_400_000).toISOString(),
        lat: n.latitude != null ? Number(n.latitude) : null,
        lng: n.longitude != null ? Number(n.longitude) : null,
        hot: !!deal?.featured,
      })
    }
    return out
  }

  // No precomputed nearby_deals rows for this user — synthesize a small list
  // from the active deals catalog so the page renders something useful without
  // requiring a precomputed feed. Fetch a generous pool so the radius/category
  // filters below still fill the requested limit.
  const deals = await findMany<Record<string, unknown>>('deals', {
    where: [{ field: 'status', operator: '=', value: 'active' }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: Math.max(limit * 4, 50),
  })
  const out: ViewNearbyDeal[] = []
  for (const deal of deals) {
    if (out.length >= limit) break
    const dealId = String(deal.id)
    const distanceKm = fallbackDistance(dealId)
    const categoryId = deal.category_id != null ? String(deal.category_id) : null
    if (!withinRadius(distanceKm) || !inCategory(categoryId)) continue
    const merchant = deal.merchant_id
      ? await findById<Record<string, unknown>>('merchants', String(deal.merchant_id))
      : null
    out.push({
      id: dealId,
      title: String(deal.title ?? ''),
      merchant: merchant?.business_name ? String(merchant.business_name) : '',
      merchant_id: String(deal.merchant_id ?? ''),
      discount_pct: Number(deal.discount_percent ?? 0),
      deal_price_cents: Number(deal.discounted_price ?? 0),
      distance_km: distanceKm,
      expires_at: asISO(deal.expires_at) ?? new Date(Date.now() + 86_400_000).toISOString(),
      lat: deal.latitude != null ? Number(deal.latitude) : null,
      lng: deal.longitude != null ? Number(deal.longitude) : null,
      hot: !!deal.featured,
    })
  }
  return out
}
