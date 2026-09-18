/**
 * Tiny response/data helpers for subscription-box.
 *
 * Pages call `useHttpClient()` which always returns an `HttpResponse<T>`
 * envelope shaped `{ data, status, headers, config }`. The backend handlers
 * sometimes return a bare object (single plan, billing status), sometimes
 * a list-envelope `{ data: T[] }` (plans collection, history pagination),
 * and sometimes `null` (no upcoming box, no active subscription). These
 * helpers normalise everything down to "the thing the page actually wants
 * to render" so pages can do `http.get(...).then(unwrapList<T>)` without
 * repeating the double-unwrap dance everywhere.
 */

export function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object' && 'data' in res) {
    const inner = (res as { data: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    // HttpResponse envelope wrapping a list-envelope: { data: { data: T[] } }
    if (
      inner &&
      typeof inner === 'object' &&
      'data' in inner &&
      Array.isArray((inner as { data: unknown }).data)
    ) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

export function unwrapSingle<T>(res: unknown): T | null {
  if (res === null || res === undefined) return null
  if (typeof res !== 'object') return null
  if (Array.isArray(res)) return null
  if ('data' in res) {
    const inner = (res as { data: unknown }).data
    if (inner === null || inner === undefined) return null
    if (Array.isArray(inner)) return null
    // HttpResponse envelope wrapping a single-envelope: { data: { data: T } }
    if (
      typeof inner === 'object' &&
      inner !== null &&
      'data' in inner &&
      typeof (inner as { data: unknown }).data === 'object' &&
      !Array.isArray((inner as { data: unknown }).data) &&
      (inner as { data: unknown }).data !== null
    ) {
      return (inner as { data: T }).data
    }
    return inner as T
  }
  return res as T
}

export function centsToLabel(cents: number, currency: string = 'USD'): string {
  if (!Number.isFinite(cents)) return ''
  const dollars = cents / 100
  if (currency === 'USD') return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(dollars)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0
  const target = new Date(iso).getTime()
  if (!Number.isFinite(target)) return 0
  const now = Date.now()
  return Math.max(0, Math.ceil((target - now) / 86_400_000))
}

export interface ApiPlan {
  id: string
  name: string
  slug: string | null
  description: string
  price: number
  currency: string
  interval: 'month' | 'quarter' | 'year'
  interval_count: number
  features: string[]
  included_items: string[]
  max_customizations: number
  stripe_price_id: string | null
  status: string
  sort_order: number
}

export interface ApiBoxItem {
  id: string
  box_id: string
  product_id: string | null
  product_variant_id: string | null
  name: string | null
  quantity: number
  is_custom: boolean
  created_at: string
}

export interface ApiBox {
  id: string
  user_id: string
  subscription_id: string | null
  theme: string | null
  billing_period: string | null
  scheduled_for: string | null
  status: 'pending' | 'customizing' | 'ready' | 'shipped' | 'delivered'
  customizations: Record<string, unknown>
  items: ApiBoxItem[]
  created_at: string
}

export interface ApiSubscription {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'paused' | 'cancelled'
  payment_subscription_id: string | null
  stripe_subscription_id: string | null
  preferences: Record<string, unknown>
  current_period_start: string | null
  current_period_end: string | null
  next_billing_date: string | null
  paused_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  trial_end: string | null
  created_at: string
  plan?: ApiPlan | null
}

export interface ApiShipment {
  id: string
  box_id: string
  user_id: string
  carrier: string | null
  tracking_number: string | null
  label_url: string | null
  estimated_delivery: string | null
  status: 'pending' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered'
  shipped_at: string | null
  delivered_at: string | null
}

export interface ApiBillingTier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: Record<string, unknown>
}

export interface ApiBillingStatus {
  planKey: string
  category: string
  name: string
  limits: Record<string, unknown>
  isFree: boolean
}
