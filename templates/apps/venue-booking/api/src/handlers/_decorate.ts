/**
 * Projection helpers — convert DB rows into the view shapes the
 * frontend pages were authored against.
 *
 * The pages render off types like `Reservation`, `VenueListing`, and
 * `MessageThread` that use snake_case + cents fields and joined
 * venue/host metadata. The DB stores the raw venue / booking / favorite
 * rows; these helpers funnel responses through one place so the
 * contract never drifts as new pages are added.
 *
 * @module
 */

import { findById } from '@molecule/api-database'

export interface ViewVenue {
  id: string
  name: string
  title: string
  description: string
  city: string
  country: string
  region: string | null
  address: string | null
  neighborhood: string | null
  capacity: number
  square_feet: number | null
  hourly_rate: number | null
  hourly_rate_cents: number | null
  daily_rate_cents: number | null
  rate_kind: 'hour' | 'day'
  rate_unit_cents: number
  currency: string
  category: string | null
  venue_type: string | null
  photos: string[]
  thumbnail_url: string | null
  amenities: string[]
  badges: string[]
  rating: number
  review_count: number
  reviews_count: number
  status: string
  host_user_id: string | null
  host_id: string | null
  host_name: string | null
  host_avatar_url: string | null
  instant_book: boolean
  house_rules: string | null
  latitude: number | null
  longitude: number | null
}

export interface ViewReservation {
  id: string
  venue_id: string
  venue_name: string
  venue_subtitle: string | null
  city: string
  country: string | null
  thumbnail_url: string | null
  starts_at_iso: string
  ends_at_iso: string
  guest_count: number | null
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  rate_kind: 'hour' | 'day'
  rate_unit_cents: number
  subtotal_cents: number
  service_fee_cents: number
  total_cents: number
  host_id: string | null
  host_name: string | null
  host_avatar_url: string | null
  host_message_count: number
  confirmation_code: string | null
  notes: string | null
  cancellable: boolean
  modifiable: boolean
}

export interface ViewFavorite {
  id: string
  venue_id: string
  name: string
  city: string
  country: string
  rating: number
  review_count: number
  thumbnail_url: string | null
  rate_kind: 'hour' | 'day'
  rate_unit_cents: number
  amenities: string[]
  badges: string[]
  saved_at_iso: string
}

export interface ViewMessageThread {
  id: string
  venue_id: string
  venue_name: string
  venue_thumbnail_url: string | null
  host_id: string | null
  host_name: string | null
  host_avatar_url: string | null
  last_message: string | null
  last_message_at_iso: string | null
  unread_count: number
  tags: string[]
}

export interface ViewMessage {
  id: string
  thread_id: string
  sender_user_id: string
  sender_name: string | null
  body: string
  attachments: unknown[]
  created_at_iso: string
  is_self: boolean
}

export interface ViewNotification {
  id: string
  kind: string
  title: string
  body: string | null
  icon: string | null
  venue_id: string | null
  venue_name: string | null
  thumbnail_url: string | null
  href: string | null
  created_at_iso: string
  unread: boolean
}

export interface ViewReview {
  id: string
  venue_id: string
  author_name: string
  author_avatar_url: string | null
  rating: number
  event_type: string | null
  comment: string
  created_at_iso: string
  host_response: string | null
}

function asISO(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(String(value)).toISOString()
}

function asISOOrNull(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  const s = String(value)
  if (!s) return null
  const parsed = new Date(s)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // Non-JSON string — return empty array as fallback.
      return []
    }
  }
  return []
}

function parseJsonObject<T = Record<string, unknown>>(raw: unknown): T {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as T
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return (parsed && typeof parsed === 'object' ? parsed : {}) as T
    } catch (_error) {
      // Non-JSON string — return empty object as fallback.
      return {} as T
    }
  }
  return {} as T
}

function parseJsonGeneric(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch (_error) {
    // Non-JSON string — return raw value as fallback.
    return raw
  }
}

/** Decorate a venues row into the rich frontend shape. */
export async function decorateVenue(venue: Record<string, unknown>): Promise<ViewVenue> {
  const photos = parseJsonArray(venue.photos)
  const amenities = parseJsonArray(venue.amenities)
  // We don't have a per-venue `badges` column in the canonical schema;
  // derive a small badge set from rating/instant_book heuristics so
  // VenueListingCard renders something for the editor's eye.
  const badges: string[] = []
  if (Number(venue.rating ?? 0) >= 4.85) badges.push('editor_pick')
  if (venue.hourly_rate_cents != null && Number(venue.hourly_rate_cents) > 0) {
    badges.push('instant_book')
  }
  const reviewsCount = Number(venue.reviews_count ?? 0)

  let host: Record<string, unknown> | null = null
  if (venue.host_user_id) {
    host = await findById<Record<string, unknown>>('users', String(venue.host_user_id))
  }

  const hourlyRateCents = venue.hourly_rate_cents != null ? Number(venue.hourly_rate_cents) : null
  const dailyRateCents = venue.daily_rate_cents != null ? Number(venue.daily_rate_cents) : null
  const rateKind: 'hour' | 'day' = hourlyRateCents && hourlyRateCents > 0 ? 'hour' : 'day'
  const rateUnitCents = rateKind === 'hour' ? (hourlyRateCents ?? 0) : (dailyRateCents ?? 0)

  const region = venue.region ? String(venue.region) : null
  const id = String(venue.id)

  return {
    id,
    name: String(venue.title ?? ''),
    title: String(venue.title ?? ''),
    description: venue.description ? String(venue.description) : '',
    city: String(venue.city ?? ''),
    country: venue.country ? String(venue.country) : 'United States',
    region,
    address: venue.address ? String(venue.address) : null,
    neighborhood: region,
    capacity: Number(venue.capacity ?? 0),
    square_feet: venue.square_feet != null ? Number(venue.square_feet) : null,
    hourly_rate: venue.hourly_rate != null ? Number(venue.hourly_rate) : null,
    hourly_rate_cents: hourlyRateCents,
    daily_rate_cents: dailyRateCents,
    rate_kind: rateKind,
    rate_unit_cents: rateUnitCents,
    currency: venue.currency ? String(venue.currency) : 'USD',
    category: venue.category ? String(venue.category) : null,
    venue_type: venue.venue_type ? String(venue.venue_type) : null,
    photos,
    thumbnail_url: photos[0] ?? null,
    amenities,
    badges,
    rating: Number(venue.rating ?? 0),
    review_count: reviewsCount,
    reviews_count: reviewsCount,
    status: String(venue.status ?? 'active'),
    host_user_id: venue.host_user_id ? String(venue.host_user_id) : null,
    host_id: venue.host_user_id ? String(venue.host_user_id) : null,
    host_name: host?.name ? String(host.name) : null,
    host_avatar_url: host?.id
      ? `https://picsum.photos/seed/alcove-host-${String(host.id).slice(0, 8)}/200/200`
      : null,
    instant_book: badges.includes('instant_book'),
    house_rules: venue.house_rules ? String(venue.house_rules) : null,
    latitude: venue.latitude != null ? Number(venue.latitude) : null,
    longitude: venue.longitude != null ? Number(venue.longitude) : null,
  }
}

export async function decorateVenues(rows: Record<string, unknown>[]): Promise<ViewVenue[]> {
  return Promise.all(rows.map((r) => decorateVenue(r)))
}

function classifyReservationStatus(booking: Record<string, unknown>): ViewReservation['status'] {
  const status = String(booking.status ?? 'pending')
  if (status === 'cancelled') return 'cancelled'
  const start = new Date(String(booking.startTime ?? booking.starts_at_iso ?? '')).getTime()
  const end = new Date(String(booking.endTime ?? booking.ends_at_iso ?? '')).getTime()
  const now = Date.now()
  if (Number.isFinite(end) && end < now) return 'completed'
  if (Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end) {
    return 'in_progress'
  }
  return 'upcoming'
}

/**
 * Generate a deterministic-ish 8-char confirmation code from a UUID
 * — first 4 + last 4 hex chars, uppercase.
 */
function makeConfirmationCode(id: string): string {
  const compact = id.replace(/-/g, '').toUpperCase()
  if (compact.length < 8) return `ALCV-${compact}`
  return `ALCV-${compact.slice(0, 4)}${compact.slice(-3)}`
}

/** Decorate a `bookings` row into the `Reservation` view shape. */
export async function decorateReservation(
  booking: Record<string, unknown>,
): Promise<ViewReservation> {
  const venueId = String(booking.resourceId ?? '')
  const venue = venueId ? await findById<Record<string, unknown>>('venues', venueId) : null
  const decoratedVenue = venue ? await decorateVenue(venue) : null
  const metadata = parseJsonObject<Record<string, unknown>>(booking.metadata)

  const status = classifyReservationStatus(booking)
  const id = String(booking.id)
  const startsAt = asISO(booking.startTime)
  const endsAt = asISO(booking.endTime)

  const hourlyRateCents = decoratedVenue?.hourly_rate_cents ?? 0
  const dailyRateCents = decoratedVenue?.daily_rate_cents ?? 0
  const rateKind: 'hour' | 'day' = decoratedVenue?.rate_kind ?? 'hour'
  const rateUnitCents = rateKind === 'hour' ? hourlyRateCents : dailyRateCents

  const subtotal =
    typeof metadata.subtotal === 'number'
      ? Math.round((metadata.subtotal as number) * 100)
      : Number(metadata.subtotalCents ?? 0)
  const serviceFee =
    typeof metadata.serviceFee === 'number'
      ? Math.round((metadata.serviceFee as number) * 100)
      : Number(metadata.serviceFeeCents ?? Math.round(subtotal * 0.1))
  const total =
    typeof metadata.total === 'number'
      ? Math.round((metadata.total as number) * 100)
      : Number(metadata.totalCents ?? subtotal + serviceFee)

  return {
    id,
    venue_id: venueId,
    venue_name: decoratedVenue?.name ?? 'Reserved space',
    venue_subtitle: decoratedVenue?.description?.slice(0, 80) ?? null,
    city: decoratedVenue?.city ?? '',
    country: decoratedVenue?.country ?? null,
    thumbnail_url: decoratedVenue?.thumbnail_url ?? null,
    starts_at_iso: startsAt,
    ends_at_iso: endsAt,
    guest_count:
      typeof metadata.guestCount === 'number'
        ? (metadata.guestCount as number)
        : metadata.guestCount
          ? Number(metadata.guestCount)
          : null,
    status,
    rate_kind: rateKind,
    rate_unit_cents: rateUnitCents,
    subtotal_cents: subtotal,
    service_fee_cents: serviceFee,
    total_cents: total,
    host_id: decoratedVenue?.host_id ?? null,
    host_name: decoratedVenue?.host_name ?? null,
    host_avatar_url: decoratedVenue?.host_avatar_url ?? null,
    host_message_count: 0,
    confirmation_code: makeConfirmationCode(id),
    notes: booking.notes ? String(booking.notes) : null,
    cancellable: status === 'upcoming',
    modifiable: status === 'upcoming',
  }
}

export async function decorateReservations(
  rows: Record<string, unknown>[],
): Promise<ViewReservation[]> {
  return Promise.all(rows.map((r) => decorateReservation(r)))
}

export async function decorateFavorite(fav: Record<string, unknown>): Promise<ViewFavorite | null> {
  const venueId = fav.venue_id ? String(fav.venue_id) : null
  if (!venueId) return null
  const venue = await findById<Record<string, unknown>>('venues', venueId)
  if (!venue) return null
  const decorated = await decorateVenue(venue)
  return {
    id: String(fav.id),
    venue_id: venueId,
    name: decorated.name,
    city: decorated.city,
    country: decorated.country,
    rating: decorated.rating,
    review_count: decorated.review_count,
    thumbnail_url: decorated.thumbnail_url,
    rate_kind: decorated.rate_kind,
    rate_unit_cents: decorated.rate_unit_cents,
    amenities: decorated.amenities,
    badges: decorated.badges,
    saved_at_iso: asISO(fav.created_at),
  }
}

export async function decorateFavorites(rows: Record<string, unknown>[]): Promise<ViewFavorite[]> {
  const out = await Promise.all(rows.map((r) => decorateFavorite(r)))
  return out.filter((x): x is ViewFavorite => x !== null)
}

/**
 * Decorate a `message_threads` row + that thread's messages into the
 * compact MessageThread shape (last message preview, unread count,
 * venue+host metadata).
 */
export async function decorateMessageThread(
  thread: Record<string, unknown>,
  selfUserId: string,
  messages: Record<string, unknown>[],
): Promise<ViewMessageThread> {
  const venueId = thread.venue_id ? String(thread.venue_id) : ''
  const venue = venueId ? await findById<Record<string, unknown>>('venues', venueId) : null
  const decorated = venue ? await decorateVenue(venue) : null

  const sorted = [...messages].sort(
    (a, b) =>
      new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime(),
  )
  const last = sorted[0]
  let unread = 0
  for (const m of messages) {
    const readBy = parseJsonArray(m.read_by)
    if (String(m.sender_user_id) !== selfUserId && !readBy.includes(selfUserId)) {
      unread++
    }
  }

  return {
    id: String(thread.id),
    venue_id: venueId,
    venue_name: decorated?.name ?? 'Conversation',
    venue_thumbnail_url: decorated?.thumbnail_url ?? null,
    host_id: decorated?.host_id ?? null,
    host_name: decorated?.host_name ?? null,
    host_avatar_url: decorated?.host_avatar_url ?? null,
    last_message: last ? String(last.body ?? '') : null,
    last_message_at_iso: last ? asISOOrNull(last.created_at) : asISOOrNull(thread.last_message_at),
    unread_count: unread,
    tags: [],
  }
}

export async function decorateMessage(
  msg: Record<string, unknown>,
  selfUserId: string,
): Promise<ViewMessage> {
  const sender = msg.sender_user_id
    ? await findById<Record<string, unknown>>('users', String(msg.sender_user_id))
    : null
  const senderName = sender?.name ? String(sender.name) : null
  return {
    id: String(msg.id),
    thread_id: String(msg.thread_id),
    sender_user_id: String(msg.sender_user_id),
    sender_name: senderName,
    body: msg.body ? String(msg.body) : '',
    attachments: parseJsonArray(msg.attachments),
    created_at_iso: asISO(msg.created_at),
    is_self: String(msg.sender_user_id) === selfUserId,
  }
}

export function decorateNotification(n: Record<string, unknown>): ViewNotification {
  const payload = parseJsonObject<Record<string, unknown>>(n.payload)
  return {
    id: String(n.id),
    kind: String(n.kind ?? 'system'),
    title: payload.title ? String(payload.title) : 'Notification',
    body: payload.body ? String(payload.body) : null,
    icon: payload.icon ? String(payload.icon) : 'notifications',
    venue_id: payload.venue_id ? String(payload.venue_id) : null,
    venue_name: payload.venue_name ? String(payload.venue_name) : null,
    thumbnail_url: payload.thumbnail_url ? String(payload.thumbnail_url) : null,
    href: payload.href ? String(payload.href) : null,
    created_at_iso: asISO(n.created_at),
    unread: !n.read_at,
  }
}

export function decorateNotifications(rows: Record<string, unknown>[]): ViewNotification[] {
  return rows.map(decorateNotification)
}

const FALLBACK_REVIEW_AUTHORS = [
  'Aisha Patel',
  'Marcus Chen',
  'Sarah Johnson',
  'Diego Rodriguez',
  'Emma Williams',
  'Kai Tanaka',
  'Olivia Brown',
  'Noah Anderson',
] as const

const FALLBACK_EVENT_TYPES = [
  'Photoshoot',
  'Brand launch',
  'Wedding',
  'Workshop',
  'Pop-up dinner',
  'Conference',
] as const

/**
 * Decorate a `reviews` row into the `Review` view shape the
 * frontend's VenueDetail page expects. Author data uses the
 * canonical user (when present) and falls back to a
 * deterministic-by-row name so the seed reviews render with
 * consistent identities across reloads.
 */
export async function decorateReview(review: Record<string, unknown>): Promise<ViewReview> {
  const id = String(review.id)
  const userId = review.userId ? String(review.userId) : null
  let authorName: string | null = null
  let authorAvatarUrl: string | null = null
  if (userId) {
    const user = await findById<Record<string, unknown>>('users', userId)
    if (user?.name) authorName = String(user.name)
    if (user?.id) {
      authorAvatarUrl = `https://picsum.photos/seed/alcove-user-${String(user.id).slice(0, 8)}/200/200`
    }
  }
  if (!authorName) {
    const idx = id.charCodeAt(0) % FALLBACK_REVIEW_AUTHORS.length
    authorName = FALLBACK_REVIEW_AUTHORS[idx] ?? 'Alcove guest'
  }
  if (!authorAvatarUrl) {
    authorAvatarUrl = `https://picsum.photos/seed/alcove-author-${id.slice(0, 8)}/200/200`
  }
  const eventTypeIdx = id.charCodeAt(1) % FALLBACK_EVENT_TYPES.length
  return {
    id,
    venue_id: review.resourceId ? String(review.resourceId) : '',
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    rating: Number(review.rating ?? 5),
    event_type: FALLBACK_EVENT_TYPES[eventTypeIdx] ?? null,
    comment: review.body ? String(review.body) : '',
    created_at_iso: asISO(review.createdAt ?? review.created_at),
    host_response: null,
  }
}

export async function decorateReviews(rows: Record<string, unknown>[]): Promise<ViewReview[]> {
  return Promise.all(rows.map((r) => decorateReview(r)))
}

export { asISO, asISOOrNull, parseJsonArray, parseJsonGeneric, parseJsonObject }
