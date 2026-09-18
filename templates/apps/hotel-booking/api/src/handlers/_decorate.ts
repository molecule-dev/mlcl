/**
 * Projection helpers — convert DB rows into the shapes the frontend
 * consumes.
 *
 * The frontend pages were authored against a fixture-driven contract
 * (PropertyListingCard, PropertyDetail, Trips, etc.) that uses
 * snake_case view fields like `price_per_night_cents`, `gallery` (as a
 * real array, not jsonb), `check_in_iso`, etc. The DB stores raw
 * columns (`min_rate`, `gallery jsonb`, `check_in date`, etc.). All
 * handlers funnel responses through these helpers so the contract
 * lives in one place and never drifts.
 *
 * @module
 */

import { findById } from '@molecule/api-database'

export interface ViewProperty {
  id: string
  name: string
  city: string
  country: string
  description: string
  rating: number
  review_count: number
  stars: number | null
  amenities: string[]
  badges: string[]
  gallery: string[]
  thumbnail_url: string | null
  /** View-side derived: cheapest room rate for this hotel, in cents. */
  price_per_night_cents: number
  address: string | null
  latitude: number | null
  longitude: number | null
}

export interface ViewRoom {
  id: string
  property_id: string
  name: string
  description: string
  capacity: number
  /** View-side alias of DB column `rate`. */
  price_per_night_cents: number
  resort_fee_cents: number
  thumbnail_url: string | null
}

export interface ViewReview {
  id: string
  property_id: string
  author: string
  date_iso: string
  rating: number
  title: string
  body: string
}

export interface ViewTrip {
  id: string
  property_id: string
  property_name: string
  city: string
  country: string
  address: string | null
  thumbnail_url: string | null
  gallery: string[]
  check_in_iso: string
  check_out_iso: string
  guests: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  subtotal_cents: number
  taxes_cents: number
  resort_fee_cents: number
  total_cents: number
  confirmation_number: string | null
  cancellable: boolean
  modifiable: boolean
  /** View-side host data: derived from hotel name when no real host is wired. */
  host_name: string
  host_message_count: number
}

export interface ViewFavorite {
  id: string
  property_id: string
  name: string
  city: string
  country: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url: string | null
  saved_at: string
}

export interface ViewNotification {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  created_at: string
  unread: boolean
}

export type LoyaltyTier = 'basic' | 'silver' | 'gold' | 'platinum'

export interface ViewLoyalty {
  tier: LoyaltyTier
  tier_label: string
  points: number
  next_tier: LoyaltyTier | null
  next_tier_points: number | null
  nights_count: number
  year_to_date_spend_cents: number
  year: number
  benefits: string[]
}

const TIER_LADDER: ReadonlyArray<{
  key: LoyaltyTier
  label: string
  threshold: number
  benefits: string[]
}> = [
  { key: 'basic', label: 'Basic', threshold: 0, benefits: ['Member rates'] },
  {
    key: 'silver',
    label: 'Silver',
    threshold: 2_000,
    benefits: ['Member rates', 'Priority support', '5% off select rates'],
  },
  {
    key: 'gold',
    label: 'Gold',
    threshold: 7_500,
    benefits: [
      'Member rates',
      'Priority support',
      '10% off select rates',
      'Late checkout when available',
    ],
  },
  {
    key: 'platinum',
    label: 'Platinum',
    threshold: 20_000,
    benefits: [
      'Member rates',
      'Priority support',
      '15% off select rates',
      'Guaranteed late checkout',
      'Complimentary room upgrades when available',
    ],
  },
]

function asISO(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // Not valid JSON — fall back to empty array as caller expects a string[]
      return []
    }
  }
  return []
}

/**
 * Decorate a hotel row into the shape PropertyListingCard /
 * PropertyDetail expect. Looks up the cheapest room rate for the
 * property to derive `price_per_night_cents` (falls back to
 * `min_rate`).
 */
export async function decorateProperty(hotel: Record<string, unknown>): Promise<ViewProperty> {
  const hotelId = String(hotel.id)
  const { findMany } = await import('@molecule/api-database')
  const rooms = await findMany<{ rate: number }>('rooms', {
    where: [{ field: 'hotel_id', operator: '=', value: hotelId }],
    orderBy: [{ field: 'rate', direction: 'asc' }],
    limit: 1,
  })
  const minRoomRate = rooms[0]?.rate ?? Number(hotel.min_rate ?? 0)

  return {
    id: hotelId,
    name: String(hotel.name ?? ''),
    city: String(hotel.city ?? ''),
    country: String(hotel.country ?? ''),
    description: hotel.description ? String(hotel.description) : '',
    rating: Number(hotel.rating ?? 0),
    review_count: Number(hotel.review_count ?? 0),
    stars: hotel.stars != null ? Number(hotel.stars) : null,
    amenities: parseJsonArray(hotel.amenities),
    badges: parseJsonArray(hotel.badges),
    gallery: parseJsonArray(hotel.gallery),
    thumbnail_url: hotel.thumbnail_url ? String(hotel.thumbnail_url) : null,
    price_per_night_cents: Number(minRoomRate),
    address: hotel.address ? String(hotel.address) : null,
    latitude: hotel.latitude != null ? Number(hotel.latitude) : null,
    longitude: hotel.longitude != null ? Number(hotel.longitude) : null,
  }
}

export async function decorateProperties(rows: Record<string, unknown>[]): Promise<ViewProperty[]> {
  return Promise.all(rows.map((r) => decorateProperty(r)))
}

export function decorateRoom(room: Record<string, unknown>): ViewRoom {
  return {
    id: String(room.id),
    property_id: String(room.hotel_id ?? ''),
    name: String(room.name ?? ''),
    description: room.description ? String(room.description) : '',
    capacity: Number(room.capacity ?? 1),
    price_per_night_cents: Number(room.rate ?? 0),
    resort_fee_cents: Number(room.resort_fee ?? 0),
    thumbnail_url: room.thumbnail_url ? String(room.thumbnail_url) : null,
  }
}

export function decorateRooms(rows: Record<string, unknown>[]): ViewRoom[] {
  return rows.map(decorateRoom)
}

export async function decorateReview(review: Record<string, unknown>): Promise<ViewReview> {
  let author = 'Auberge member'
  const userId = review.userId
  if (userId) {
    const user = await findById<Record<string, unknown>>('users', String(userId))
    if (user) {
      const name = user.name ? String(user.name) : null
      const email = user.email ? String(user.email) : null
      author = name || email?.split('@')[0] || 'Auberge member'
    }
  }
  return {
    id: String(review.id),
    property_id: String(review.resourceId ?? ''),
    author,
    date_iso: asISO(review.createdAt),
    rating: Number(review.rating ?? 0),
    title: review.title ? String(review.title) : '',
    body: review.body ? String(review.body) : '',
  }
}

export async function decorateReviews(rows: Record<string, unknown>[]): Promise<ViewReview[]> {
  return Promise.all(rows.map((r) => decorateReview(r)))
}

function classifyTripStatus(reservation: Record<string, unknown>): ViewTrip['status'] {
  const status = String(reservation.status ?? 'pending')
  if (status === 'cancelled') return 'cancelled'
  const checkIn = new Date(String(reservation.check_in)).getTime()
  const checkOut = new Date(String(reservation.check_out)).getTime()
  const now = Date.now()
  if (Number.isFinite(checkOut) && checkOut < now) return 'completed'
  if (Number.isFinite(checkIn) && checkIn <= now && Number.isFinite(checkOut) && now <= checkOut)
    return 'in_progress'
  return 'upcoming'
}

export async function decorateTrip(reservation: Record<string, unknown>): Promise<ViewTrip> {
  const hotel = reservation.hotel_id
    ? await findById<Record<string, unknown>>('hotels', String(reservation.hotel_id))
    : null

  const status = classifyTripStatus(reservation)
  const checkIn = String(reservation.check_in)
  const checkOut = String(reservation.check_out)

  return {
    id: String(reservation.id),
    property_id: String(reservation.hotel_id ?? ''),
    property_name: hotel?.name ? String(hotel.name) : 'Reserved stay',
    city: hotel?.city ? String(hotel.city) : '',
    country: hotel?.country ? String(hotel.country) : '',
    address: hotel?.address ? String(hotel.address) : null,
    thumbnail_url: hotel?.thumbnail_url ? String(hotel.thumbnail_url) : null,
    gallery: hotel ? parseJsonArray(hotel.gallery) : [],
    check_in_iso: new Date(checkIn).toISOString(),
    check_out_iso: new Date(checkOut).toISOString(),
    guests: Number(reservation.guests ?? 1),
    status,
    subtotal_cents: Number(reservation.subtotal ?? 0),
    taxes_cents: Number(reservation.taxes ?? 0),
    resort_fee_cents: Number(reservation.resort_fee ?? 0),
    total_cents: Number(reservation.total ?? 0),
    confirmation_number: reservation.confirmation_number
      ? String(reservation.confirmation_number)
      : null,
    cancellable: status === 'upcoming',
    modifiable: status === 'upcoming',
    host_name: hotel?.name ? `${String(hotel.name)} concierge` : 'Auberge concierge',
    host_message_count: 0,
  }
}

export async function decorateTrips(rows: Record<string, unknown>[]): Promise<ViewTrip[]> {
  return Promise.all(rows.map((r) => decorateTrip(r)))
}

export async function decorateFavorite(
  bookmark: Record<string, unknown>,
): Promise<ViewFavorite | null> {
  const propertyId = bookmark.resourceId ? String(bookmark.resourceId) : null
  if (!propertyId) return null
  const hotel = await findById<Record<string, unknown>>('hotels', propertyId)
  if (!hotel) return null
  const property = await decorateProperty(hotel)
  return {
    id: String(bookmark.id),
    property_id: propertyId,
    name: property.name,
    city: property.city,
    country: property.country,
    rating: property.rating,
    review_count: property.review_count,
    price_per_night_cents: property.price_per_night_cents,
    thumbnail_url: property.thumbnail_url,
    saved_at: asISO(bookmark.createdAt),
  }
}

export async function decorateFavorites(rows: Record<string, unknown>[]): Promise<ViewFavorite[]> {
  const out = await Promise.all(rows.map((r) => decorateFavorite(r)))
  return out.filter((x): x is ViewFavorite => x !== null)
}

export function decorateNotification(n: Record<string, unknown>): ViewNotification {
  return {
    id: String(n.id),
    type: String(n.type ?? 'system'),
    title: String(n.title ?? ''),
    body: n.body ? String(n.body) : null,
    href: n.href ? String(n.href) : null,
    created_at: asISO(n.created_at),
    unread: !n.read,
  }
}

export function decorateNotifications(rows: Record<string, unknown>[]): ViewNotification[] {
  return rows.map(decorateNotification)
}

export function decorateLoyalty(loyalty: Record<string, unknown> | null): ViewLoyalty {
  const points = loyalty ? Number(loyalty.points ?? 0) : 0
  const tierKey = (loyalty?.tier as ViewLoyalty['tier'] | undefined) ?? 'basic'
  const current = TIER_LADDER.find((t) => t.key === tierKey) ?? TIER_LADDER[0]
  const idx = TIER_LADDER.indexOf(current)
  const next = TIER_LADDER[idx + 1] ?? null
  return {
    tier: current.key,
    tier_label: current.label,
    points,
    next_tier: next ? next.key : null,
    next_tier_points: next ? next.threshold : null,
    nights_count: loyalty ? Number(loyalty.nights_count ?? 0) : 0,
    year_to_date_spend_cents: loyalty ? Number(loyalty.year_to_date_spend_cents ?? 0) : 0,
    year: loyalty ? Number(loyalty.year ?? new Date().getFullYear()) : new Date().getFullYear(),
    benefits: current.benefits,
  }
}
