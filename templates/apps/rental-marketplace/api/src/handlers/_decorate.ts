/**
 * Projection helpers — convert DB rows into the view shapes the
 * frontend pages were authored against.
 *
 * The pages render off shapes like `ViewListing`, `ViewBooking`,
 * `ViewBookmark`, and `ViewMessageThread` that use snake_case + cents
 * fields and joined host/listing metadata. The DB stores raw rows;
 * these helpers funnel responses through one place so the contract
 * never drifts as new pages are added.
 *
 * @module
 */

import { count, findById, findMany } from '@molecule/api-database'

export interface ViewListing {
  id: string
  title: string
  description: string
  property_type: string | null
  city: string
  state: string | null
  country: string
  address: string | null
  postal_code: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  max_guests: number
  bedrooms: number
  beds: number
  bathrooms: number
  amenities: string[]
  images: string[]
  gallery: string[]
  thumbnail_url: string | null
  price_per_night: number
  price_per_night_cents: number
  cleaning_fee: number
  cleaning_fee_cents: number
  service_fee_rate: number
  currency: string
  status: string
  rating: number
  review_count: number
  reviews_count: number
  total_bookings: number
  badges: string[]
  instant_book: boolean
  house_rules: string | null
  host_id: string | null
  host_name: string | null
  host_username: string | null
  host_email: string | null
  host_photo: string | null
  host_avatar_url: string | null
  host_is_superhost: boolean
  host_response_rate: number
  host_years: number
  created_at_iso: string
}

export interface ViewBooking {
  id: string
  listing_id: string
  listing_title: string
  city: string
  country: string
  thumbnail_url: string | null
  check_in_iso: string
  check_out_iso: string
  starts_at_iso: string
  ends_at_iso: string
  guests: number
  nights: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  subtotal_cents: number
  cleaning_fee_cents: number
  service_fee_cents: number
  taxes_cents: number
  total_cents: number
  host_id: string | null
  host_name: string | null
  host_photo: string | null
  guest_id: string | null
  guest_name: string | null
  guest_photo: string | null
  guest_country: string | null
  guest_trips_completed: number
  confirmation_code: string
  cancellable: boolean
  modifiable: boolean
  messages_unread: number
  instant_book: boolean
  expires_at: string | null
  notes: string | null
}

export interface ViewBookmark {
  id: string
  listing_id: string
  listing_title: string
  city: string
  country: string
  thumbnail_url: string | null
  rating: number
  review_count: number
  price_per_night_cents: number
  saved_at: string
  collection: string | null
}

export interface ViewMessageThread {
  id: string
  listing_id: string | null
  listing_title: string | null
  thumbnail_url: string | null
  other_party_id: string
  other_party_name: string | null
  other_party_photo: string | null
  other_party_is_host: boolean
  last_message: string | null
  last_message_at: string | null
  unread: boolean
}

export interface ViewMessage {
  id: string
  thread_id: string
  sender_id: string
  sender_name: string | null
  body: string
  created_at_iso: string
  is_self: boolean
}

export interface ViewNotification {
  id: string
  type: string
  title: string
  body: string | null
  icon: string | null
  listing_id: string | null
  listing_title: string | null
  thumbnail_url: string | null
  href: string | null
  created_at_iso: string
  unread: boolean
}

export interface ViewReview {
  id: string
  listing_id: string
  rating: number
  title: string
  comment: string
  helpful: number
  created_at: string
  created_at_iso: string
  guest_id: string
  guest_name: string
  guest_photo: string
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
      // Invalid JSON string — return empty array as fallback.
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
      // Invalid JSON string — return empty object as fallback.
      return {} as T
    }
  }
  return {} as T
}

function deriveBadges(rating: number, reviewsCount: number, totalBookings: number): string[] {
  const badges: string[] = []
  if (rating >= 4.85 && reviewsCount >= 50) badges.push('superhost')
  if (rating >= 4.9) badges.push('editor_pick')
  if (totalBookings >= 200) badges.push('frequently_booked')
  return badges
}

function makeConfirmationCode(id: string): string {
  const compact = id.replace(/-/g, '').toUpperCase()
  if (compact.length < 8) return `RST-${compact}`
  return `RST-${compact.slice(0, 4)}${compact.slice(-3)}`
}

function classifyBookingStatus(b: Record<string, unknown>): ViewBooking['status'] {
  const status = String(b.status ?? 'pending')
  if (status === 'cancelled') return 'cancelled'
  const end = new Date(String(b.endTime ?? '')).getTime()
  if (Number.isFinite(end) && end < Date.now()) return 'completed'
  if (status === 'confirmed') return 'confirmed'
  if (status === 'completed') return 'completed'
  return 'pending'
}

/** Decorate a `listings` row into the rich frontend shape. */
export async function decorateListing(listing: Record<string, unknown>): Promise<ViewListing> {
  const images = parseJsonArray(listing.images)
  const amenities = parseJsonArray(listing.amenities)
  const rating = Number(listing.rating ?? 0)
  const reviewsCount = Number(listing.reviews_count ?? 0)
  const totalBookings = Number(listing.total_bookings ?? 0)

  let host: Record<string, unknown> | null = null
  if (listing.host_id) {
    host = await findById<Record<string, unknown>>('users', String(listing.host_id))
  }

  const pricePerNight = Number(listing.price_per_night ?? 0)
  const cleaningFee = Number(listing.cleaning_fee ?? 0)
  const serviceFeeRate = Number(listing.service_fee_rate ?? 0.12)
  const id = String(listing.id)
  const badges = deriveBadges(rating, reviewsCount, totalBookings)
  const isSuperhost = badges.includes('superhost')
  const instantBook = Boolean(listing.instant_book ?? badges.includes('superhost'))

  const hostId = listing.host_id ? String(listing.host_id) : null
  const createdAtIso = asISOOrNull(listing.created_at) ?? new Date().toISOString()

  const hostAvatar = hostId
    ? `https://picsum.photos/seed/roost-host-${hostId.slice(-12)}/200/200`
    : null

  // Rough host tenure in years from createdAt — falls back to a
  // deterministic value derived from the host id so the UI can render
  // something credible even when the user row is fresh.
  let hostYears = 1
  if (host?.createdAt) {
    const created = new Date(String(host.createdAt)).getTime()
    if (Number.isFinite(created)) {
      hostYears = Math.max(1, Math.round((Date.now() - created) / (1000 * 60 * 60 * 24 * 365)))
    }
  }

  return {
    id,
    title: String(listing.title ?? ''),
    description: listing.description ? String(listing.description) : '',
    property_type: listing.property_type ? String(listing.property_type) : null,
    city: String(listing.city ?? ''),
    state: listing.state ? String(listing.state) : null,
    country: listing.country ? String(listing.country) : 'United States',
    address: listing.address ? String(listing.address) : null,
    postal_code: listing.postal_code ? String(listing.postal_code) : null,
    neighborhood: listing.state ? String(listing.state) : null,
    latitude: listing.latitude != null ? Number(listing.latitude) : null,
    longitude: listing.longitude != null ? Number(listing.longitude) : null,
    max_guests: Number(listing.max_guests ?? 1),
    bedrooms: Number(listing.bedrooms ?? 0),
    beds: Number(listing.beds ?? 0),
    bathrooms: Number(listing.bathrooms ?? 0),
    amenities,
    images,
    gallery: images,
    thumbnail_url: images[0] ?? null,
    price_per_night: pricePerNight,
    price_per_night_cents: Math.round(pricePerNight * 100),
    cleaning_fee: cleaningFee,
    cleaning_fee_cents: Math.round(cleaningFee * 100),
    service_fee_rate: serviceFeeRate,
    currency: listing.currency ? String(listing.currency) : 'USD',
    status: String(listing.status ?? 'active'),
    rating,
    review_count: reviewsCount,
    reviews_count: reviewsCount,
    total_bookings: totalBookings,
    badges,
    instant_book: instantBook,
    house_rules: 'No smoking. No parties. Quiet hours 22:00–08:00.',
    host_id: hostId,
    host_name: host?.name ? String(host.name) : null,
    host_username: host?.username ? String(host.username) : null,
    host_email: host?.email ? String(host.email) : null,
    host_photo: hostAvatar,
    host_avatar_url: hostAvatar,
    host_is_superhost: isSuperhost,
    host_response_rate: 96,
    host_years: hostYears,
    created_at_iso: createdAtIso,
  }
}

export async function decorateListings(rows: Record<string, unknown>[]): Promise<ViewListing[]> {
  return Promise.all(rows.map((r) => decorateListing(r)))
}

interface BookingMetadata {
  hostId?: string | null
  guests?: number
  subtotal?: number
  serviceFee?: number
  cleaningFee?: number
  total?: number
  nights?: number
  paymentIntentId?: string | null
  cancellationReason?: string | null
}

/** Decorate a `bookings` row into the rich `ViewBooking` shape. */
export async function decorateBooking(
  booking: Record<string, unknown>,
  selfUserId: string | null = null,
): Promise<ViewBooking> {
  const listingId = booking.resourceId ? String(booking.resourceId) : ''
  const listing = listingId ? await findById<Record<string, unknown>>('listings', listingId) : null
  const decoratedListing = listing ? await decorateListing(listing) : null
  const meta = parseJsonObject<BookingMetadata>(booking.metadata)

  const id = String(booking.id)
  const startsIso = asISO(booking.startTime)
  const endsIso = asISO(booking.endTime)
  const startMs = new Date(startsIso).getTime()
  const endMs = new Date(endsIso).getTime()
  const nights = Number(
    meta.nights ?? Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24))),
  )

  const subtotal =
    typeof meta.subtotal === 'number'
      ? Math.round(meta.subtotal * 100)
      : Math.round((decoratedListing?.price_per_night ?? 0) * nights * 100)
  const cleaningFeeCents =
    typeof meta.cleaningFee === 'number'
      ? Math.round(meta.cleaningFee * 100)
      : (decoratedListing?.cleaning_fee_cents ?? 0)
  const serviceFeeCents =
    typeof meta.serviceFee === 'number'
      ? Math.round(meta.serviceFee * 100)
      : Math.round(subtotal * Number(decoratedListing?.service_fee_rate ?? 0.12))
  const taxesCents = Math.round((subtotal + cleaningFeeCents + serviceFeeCents) * 0.07)
  const total =
    typeof meta.total === 'number'
      ? Math.round(meta.total * 100)
      : subtotal + cleaningFeeCents + serviceFeeCents + taxesCents

  const status = classifyBookingStatus(booking)
  const guestId = booking.userId ? String(booking.userId) : null
  const guest = guestId ? await findById<Record<string, unknown>>('users', guestId) : null
  const guestPhoto = guestId
    ? `https://picsum.photos/seed/roost-guest-${guestId.slice(-12)}/200/200`
    : null
  const guestTripsCompleted = guestId
    ? await count('bookings', [
        { field: 'userId', operator: '=', value: guestId },
        { field: 'status', operator: '=', value: 'completed' },
      ])
    : 0

  // Compute unread message count for self if we have a self-user id.
  let messagesUnread = 0
  if (selfUserId && decoratedListing?.host_id) {
    const otherParticipant =
      selfUserId === decoratedListing.host_id ? guestId : decoratedListing.host_id
    if (otherParticipant) {
      const [pa, pb] = [selfUserId, otherParticipant].sort()
      const threads = await findMany<Record<string, unknown>>('message_threads', {
        where: [
          { field: 'participant_a_id', operator: '=', value: pa },
          { field: 'participant_b_id', operator: '=', value: pb },
          { field: 'listing_id', operator: '=', value: listingId },
        ],
        limit: 1,
      })
      if (threads[0]) {
        const allMsgs = await findMany<Record<string, unknown>>('messages', {
          where: [{ field: 'thread_id', operator: '=', value: threads[0].id }],
          limit: 200,
        })
        messagesUnread = allMsgs.filter(
          (m) => String(m.sender_id) !== selfUserId && !m.read_at,
        ).length
      }
    }
  }

  return {
    id,
    listing_id: listingId,
    listing_title: decoratedListing?.title ?? 'Listing unavailable',
    city: decoratedListing?.city ?? '',
    country: decoratedListing?.country ?? '',
    thumbnail_url: decoratedListing?.thumbnail_url ?? null,
    check_in_iso: startsIso,
    check_out_iso: endsIso,
    starts_at_iso: startsIso,
    ends_at_iso: endsIso,
    guests: Number(meta.guests ?? 1),
    nights,
    status,
    subtotal_cents: subtotal,
    cleaning_fee_cents: cleaningFeeCents,
    service_fee_cents: serviceFeeCents,
    taxes_cents: taxesCents,
    total_cents: total,
    host_id: decoratedListing?.host_id ?? null,
    host_name: decoratedListing?.host_name ?? null,
    host_photo: decoratedListing?.host_photo ?? null,
    guest_id: guestId,
    guest_name: guest?.name ? String(guest.name) : null,
    guest_photo: guestPhoto,
    guest_country: 'United States',
    guest_trips_completed: guestTripsCompleted,
    confirmation_code: makeConfirmationCode(id),
    cancellable: status === 'pending' || status === 'confirmed',
    modifiable: status === 'pending' || status === 'confirmed',
    messages_unread: messagesUnread,
    instant_book: decoratedListing?.instant_book ?? false,
    expires_at:
      status === 'pending' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    notes: booking.notes ? String(booking.notes) : null,
  }
}

export async function decorateBookings(
  rows: Record<string, unknown>[],
  selfUserId: string | null = null,
): Promise<ViewBooking[]> {
  return Promise.all(rows.map((r) => decorateBooking(r, selfUserId)))
}

export async function decorateBookmark(bm: Record<string, unknown>): Promise<ViewBookmark | null> {
  const listingId = bm.resourceId ? String(bm.resourceId) : null
  if (!listingId) return null
  const listing = await findById<Record<string, unknown>>('listings', listingId)
  if (!listing) return null
  const decorated = await decorateListing(listing)
  return {
    id: String(bm.id),
    listing_id: listingId,
    listing_title: decorated.title,
    city: decorated.city,
    country: decorated.country,
    thumbnail_url: decorated.thumbnail_url,
    rating: decorated.rating,
    review_count: decorated.review_count,
    price_per_night_cents: decorated.price_per_night_cents,
    saved_at: asISO(bm.createdAt ?? bm.created_at),
    collection: bm.folder ? String(bm.folder) : null,
  }
}

export async function decorateBookmarks(rows: Record<string, unknown>[]): Promise<ViewBookmark[]> {
  const out = await Promise.all(rows.map((r) => decorateBookmark(r)))
  return out.filter((x): x is ViewBookmark => x !== null)
}

/**
 * Decorate a `message_threads` row into the compact MessageThread shape
 * the frontend expects: last message preview, unread, listing+host
 * metadata, "other party" view from the perspective of `selfUserId`.
 */
export async function decorateMessageThread(
  thread: Record<string, unknown>,
  selfUserId: string,
): Promise<ViewMessageThread> {
  const listingId = thread.listing_id ? String(thread.listing_id) : null
  const listing = listingId ? await findById<Record<string, unknown>>('listings', listingId) : null
  const decoratedListing = listing ? await decorateListing(listing) : null

  const a = thread.participant_a_id ? String(thread.participant_a_id) : ''
  const b = thread.participant_b_id ? String(thread.participant_b_id) : ''
  const other = selfUserId === a ? b : a
  const otherUser = other ? await findById<Record<string, unknown>>('users', other) : null
  const otherIsHost = decoratedListing?.host_id === other

  const messages = await findMany<Record<string, unknown>>('messages', {
    where: [{ field: 'thread_id', operator: '=', value: thread.id }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 1,
  })
  const last = messages[0]
  const otherUnread = await findMany<Record<string, unknown>>('messages', {
    where: [{ field: 'thread_id', operator: '=', value: thread.id }],
    limit: 200,
  })
  const unread = otherUnread.some((m) => String(m.sender_id) !== selfUserId && !m.read_at)

  const otherPhoto = other
    ? `https://picsum.photos/seed/roost-host-${other.slice(-12)}/200/200`
    : null

  return {
    id: String(thread.id),
    listing_id: listingId,
    listing_title: decoratedListing?.title ?? null,
    thumbnail_url: decoratedListing?.thumbnail_url ?? null,
    other_party_id: other,
    other_party_name: otherUser?.name ? String(otherUser.name) : null,
    other_party_photo: otherPhoto,
    other_party_is_host: otherIsHost,
    last_message: last
      ? String(last.body ?? '')
      : thread.last_message_preview
        ? String(thread.last_message_preview)
        : null,
    last_message_at: asISOOrNull(thread.last_message_at) ?? (last ? asISO(last.created_at) : null),
    unread,
  }
}

export async function decorateMessage(
  msg: Record<string, unknown>,
  selfUserId: string,
): Promise<ViewMessage> {
  const sender = msg.sender_id
    ? await findById<Record<string, unknown>>('users', String(msg.sender_id))
    : null
  return {
    id: String(msg.id),
    thread_id: String(msg.thread_id),
    sender_id: String(msg.sender_id),
    sender_name: sender?.name ? String(sender.name) : null,
    body: msg.body ? String(msg.body) : '',
    created_at_iso: asISO(msg.created_at),
    is_self: String(msg.sender_id) === selfUserId,
  }
}

export function decorateNotification(n: Record<string, unknown>): ViewNotification {
  const payload = parseJsonObject<Record<string, unknown>>(n.payload)
  return {
    id: String(n.id),
    type: String(n.type ?? 'system'),
    title: payload.title ? String(payload.title) : 'Notification',
    body: payload.body ? String(payload.body) : null,
    icon: payload.icon ? String(payload.icon) : 'notifications',
    listing_id: payload.listing_id ? String(payload.listing_id) : null,
    listing_title: payload.listing_title ? String(payload.listing_title) : null,
    thumbnail_url: payload.thumbnail_url ? String(payload.thumbnail_url) : null,
    href: payload.href ? String(payload.href) : null,
    created_at_iso: asISO(n.created_at),
    unread: !n.read_at,
  }
}

export function decorateNotifications(rows: Record<string, unknown>[]): ViewNotification[] {
  return rows.map(decorateNotification)
}

/** Decorate a `reviews` row into the rich `ViewReview` shape the
 * ListingDetail page renders against (snake_case + guest metadata). */
export async function decorateReview(review: Record<string, unknown>): Promise<ViewReview> {
  const guestId = review.userId ? String(review.userId) : ''
  const guest = guestId ? await findById<Record<string, unknown>>('users', guestId) : null
  const guestPhoto = guestId
    ? `https://picsum.photos/seed/roost-guest-${guestId.slice(-12)}/200/200`
    : ''
  const createdIso = asISO(review.createdAt ?? review.created_at)
  return {
    id: String(review.id),
    listing_id: String(review.resourceId ?? ''),
    rating: Number(review.rating ?? 0),
    title: review.title ? String(review.title) : '',
    comment: review.body ? String(review.body) : '',
    helpful: Number(review.helpful ?? 0),
    created_at: createdIso,
    created_at_iso: createdIso,
    guest_id: guestId,
    guest_name: guest?.name ? String(guest.name) : 'Guest',
    guest_photo: guestPhoto,
  }
}

export async function decorateReviews(rows: Record<string, unknown>[]): Promise<ViewReview[]> {
  return Promise.all(rows.map((r) => decorateReview(r)))
}

export { asISO, asISOOrNull, parseJsonArray, parseJsonObject }
