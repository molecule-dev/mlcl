/**
 * Shared PMS domain logic for ai-hotel-receptionist.
 *
 * Everything here is the single implementation behind BOTH surfaces:
 *
 * - the HTTP handlers (`/api/availability`, `/api/reservations`, …), and
 * - the voice agent's TOOLS (`search_availability`, `create_reservation`,
 *   `lookup_reservation`) — so a booking made over the phone and one made
 *   at the front desk run through the exact same pricing, occupancy and
 *   overbooking rules.
 *
 * All persistence flows through `@molecule/api-database`'s DataStore — no
 * raw SQL. Date math is UTC `YYYY-MM-DD` strings matching the `date`
 * columns.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import {
  count,
  create,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

export interface RoomTypeRow {
  id: string
  name: string
  description: string | null
  occupancy: number
  base_rate_cents: number
  amenities: unknown
}

export interface RoomRow {
  id: string
  number: string
  floor: number
  room_type_id: string
  status: 'vacant_clean' | 'occupied' | 'cleaning' | 'out_of_order'
  notes: string | null
}

export interface RatePlanRow {
  id: string
  name: string
  room_type_id: string
  weekday_adjustment_percent: number
  weekend_adjustment_percent: number
  seasonal_override_cents: number | null
  seasonal_start: string | null
  seasonal_end: string | null
  active: boolean
}

export interface ReservationRow {
  id: string
  guest_id: string | null
  guest_name: string
  guest_contact: string | null
  room_type_id: string
  room_id: string | null
  check_in: string
  check_out: string
  guests: number
  nights: number
  total_cents: number
  status: 'held' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  source: 'phone' | 'front_desk' | 'online'
  confirmation_code: string
  notes: string | null
  created_by: string | null
}

/** Reservation statuses that hold inventory (block the room from being re-sold). */
export const ACTIVE_STATUSES = ['held', 'confirmed', 'checked_in'] as const

/** Allowed status transitions of the reservation lifecycle. */
export const STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  held: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  no_show: [],
}

export class PmsError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isoPlusDays(days: number, from = new Date()): string {
  const d = new Date(from.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Next Friday (UTC) on or after `from`, as YYYY-MM-DD. */
export function nextFridayIso(from = new Date()): string {
  const d = new Date(from.getTime())
  // getUTCDay: 0=Sun … 5=Fri
  const delta = (5 - d.getUTCDay() + 7) % 7
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function countNights(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn + 'T00:00:00Z')
  const b = Date.parse(checkOut + 'T00:00:00Z')
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new PmsError(400, 'invalid_dates', 'Invalid check-in/check-out date')
  }
  const nights = Math.round((b - a) / (1000 * 60 * 60 * 24))
  if (nights < 1) {
    throw new PmsError(400, 'checkout_before_checkin', 'Check-out must be after check-in')
  }
  return nights
}

function isWeekend(iso: string): boolean {
  const day = new Date(iso + 'T00:00:00Z').getUTCDay()
  return day === 5 || day === 6
}

function dateInRange(iso: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  return iso >= start && iso <= end
}

/**
 * Nightly rate for one night of a room type: the active plan's seasonal
 * override when the night falls inside its window, otherwise the base rate
 * adjusted by the plan's weekday/weekend percent.
 */
export function computeNightlyRateCents(
  roomType: Pick<RoomTypeRow, 'base_rate_cents'>,
  plans: ReadonlyArray<
    Pick<
      RatePlanRow,
      | 'seasonal_override_cents'
      | 'seasonal_start'
      | 'seasonal_end'
      | 'weekday_adjustment_percent'
      | 'weekend_adjustment_percent'
      | 'active'
    >
  >,
  nightIso: string,
): number {
  const base = Number(roomType.base_rate_cents) || 0
  const plan = plans.find((p) => p.active)
  if (!plan) return base
  if (
    plan.seasonal_override_cents !== null &&
    plan.seasonal_override_cents !== undefined &&
    dateInRange(nightIso, plan.seasonal_start, plan.seasonal_end)
  ) {
    return Number(plan.seasonal_override_cents)
  }
  const pct = isWeekend(nightIso)
    ? Number(plan.weekend_adjustment_percent) || 0
    : Number(plan.weekday_adjustment_percent) || 0
  return Math.max(0, Math.round(base * (1 + pct / 100)))
}

export interface NightBreakdown {
  date: string
  rate_cents: number
}

export interface AvailabilityOption {
  room_type: RoomTypeRow
  rooms_total: number
  rooms_available: number
  nightly_rates: NightBreakdown[]
  total_cents: number
  avg_rate_cents: number
}

async function loadRatePlans(roomTypeId: string): Promise<RatePlanRow[]> {
  return findMany<RatePlanRow>('rate_plans', {
    where: [
      { field: 'room_type_id', operator: '=', value: roomTypeId },
      { field: 'active', operator: '=', value: true },
    ],
  })
}

async function overlappingActiveReservations(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
): Promise<ReservationRow[]> {
  return findMany<ReservationRow>('reservations', {
    where: [
      { field: 'room_type_id', operator: '=', value: roomTypeId },
      { field: 'status', operator: 'in', value: [...ACTIVE_STATUSES] },
      { field: 'check_in', operator: '<', value: checkOut },
      { field: 'check_out', operator: '>', value: checkIn },
    ],
  })
}

/**
 * Search availability for a date range × occupancy. Returns one option per
 * room type that (a) sleeps the party and (b) still has a physical unit
 * free for every night of the stay, with the computed nightly + total rates.
 */
export async function searchAvailability(input: {
  check_in: string
  check_out: string
  guests?: number
}): Promise<AvailabilityOption[]> {
  const nights = countNights(input.check_in, input.check_out)
  const guests = Math.max(1, Number(input.guests ?? 1))

  const roomTypes = await findMany<RoomTypeRow>('room_types', {
    orderBy: [{ field: 'base_rate_cents', direction: 'asc' }],
  })
  const options: AvailabilityOption[] = []

  for (const rt of roomTypes) {
    if (Number(rt.occupancy) < guests) continue

    const rooms = await findMany<RoomRow>('rooms', {
      where: [
        { field: 'room_type_id', operator: '=', value: rt.id },
        { field: 'status', operator: '!=', value: 'out_of_order' },
      ],
    })
    if (rooms.length === 0) continue

    const overlapping = await overlappingActiveReservations(rt.id, input.check_in, input.check_out)
    const available = rooms.length - overlapping.length
    if (available <= 0) continue

    const plans = await loadRatePlans(rt.id)
    const nightly: NightBreakdown[] = []
    for (let i = 0; i < nights; i++) {
      const night = isoPlusDays(i, new Date(input.check_in + 'T00:00:00Z'))
      nightly.push({ date: night, rate_cents: computeNightlyRateCents(rt, plans, night) })
    }
    const total = nightly.reduce((sum, n) => sum + n.rate_cents, 0)

    options.push({
      room_type: rt,
      rooms_total: rooms.length,
      rooms_available: available,
      nightly_rates: nightly,
      total_cents: total,
      avg_rate_cents: Math.round(total / nights),
    })
  }

  return options
}

/**
 * 8-char confirmation code from a CSPRNG with rejection sampling —
 * guest-presented credentials must not be guessable (copied from the
 * hotel-booking donor's approach [L2-1]).
 */
export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const limit = 256 - (256 % chars.length)
  let result = ''
  while (result.length < 8) {
    const buf = randomBytes(16)
    for (let i = 0; i < buf.length && result.length < 8; i++) {
      if (buf[i]! < limit) result += chars.charAt(buf[i]! % chars.length)
    }
  }
  return result
}

export interface CreateReservationInput {
  room_type_id: string
  guest_name: string
  guest_contact?: string | null
  guest_id?: string | null
  check_in: string
  check_out: string
  guests: number
  source?: 'phone' | 'front_desk' | 'online'
  notes?: string | null
  created_by?: string | null
}

/**
 * Create a reservation with the full validation chain: date sanity, room
 * type existence, occupancy ceiling, overbooking guard (physical units per
 * type), rate computation via the active rate plan, and confirmation-code
 * minting. Throws {@link PmsError} with an HTTP-shaped status on failure.
 */
export async function createReservationInternal(
  input: CreateReservationInput,
): Promise<ReservationRow> {
  const nights = countNights(input.check_in, input.check_out)
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw new PmsError(400, 'invalid_guests', 'Guests must be a positive integer')
  }

  const roomType = await findOne<RoomTypeRow>('room_types', [
    { field: 'id', operator: '=', value: input.room_type_id },
  ])
  if (!roomType) {
    throw new PmsError(404, 'room_type_not_found', 'Room type not found')
  }
  if (Number(roomType.occupancy) < input.guests) {
    throw new PmsError(
      400,
      'over_capacity',
      `This room type sleeps up to ${roomType.occupancy} guests`,
    )
  }

  const rooms = await count('rooms', [
    { field: 'room_type_id', operator: '=', value: roomType.id },
    { field: 'status', operator: '!=', value: 'out_of_order' },
  ])
  const overlapping = await overlappingActiveReservations(
    roomType.id,
    input.check_in,
    input.check_out,
  )
  if (overlapping.length >= Math.max(1, rooms)) {
    throw new PmsError(
      409,
      'room_unavailable',
      'That room type is already fully booked for those dates',
    )
  }

  const plans = await loadRatePlans(roomType.id)
  let total = 0
  for (let i = 0; i < nights; i++) {
    const night = isoPlusDays(i, new Date(input.check_in + 'T00:00Z'))
    total += computeNightlyRateCents(roomType, plans, night)
  }

  const result = await create<ReservationRow>('reservations', {
    guest_id: input.guest_id ?? null,
    guest_name: input.guest_name,
    guest_contact: input.guest_contact ?? null,
    room_type_id: roomType.id,
    room_id: null,
    check_in: input.check_in,
    check_out: input.check_out,
    guests: input.guests,
    nights,
    total_cents: total,
    status: 'confirmed',
    source: input.source ?? 'front_desk',
    confirmation_code: generateConfirmationCode(),
    notes: input.notes ?? null,
    created_by: input.created_by ?? null,
  })
  return (result.data ?? result) as ReservationRow
}

/** Look up a reservation by its guest-presented confirmation code. */
export async function lookupReservationByCode(code: string): Promise<ReservationRow | null> {
  return findOne<ReservationRow>('reservations', [
    { field: 'confirmation_code', operator: '=', value: code.toUpperCase() },
  ])
}

/**
 * Apply a lifecycle status transition (with its guard + timestamp) and keep
 * the guest profile's stay_count in sync on checkout.
 */
export async function transitionReservation(
  reservationId: string,
  nextStatus: ReservationRow['status'],
): Promise<ReservationRow> {
  const existing = await findOne<ReservationRow>('reservations', [
    { field: 'id', operator: '=', value: reservationId },
  ])
  if (!existing) {
    throw new PmsError(404, 'reservation_not_found', 'Reservation not found')
  }
  const allowed = STATUS_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(nextStatus)) {
    throw new PmsError(
      409,
      'invalid_transition',
      `Cannot move a ${existing.status} reservation to ${nextStatus}`,
    )
  }

  const patch: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'cancelled') patch.cancelled_at = new Date()
  if (nextStatus === 'checked_in') patch.checked_in_at = new Date()
  if (nextStatus === 'checked_out') patch.checked_out_at = new Date()

  const result = await updateById<ReservationRow>('reservations', reservationId, patch)

  if (nextStatus === 'checked_out' && existing.guest_id) {
    // Best-effort stay_count bump; a profile deleted mid-stay must not fail
    // the checkout itself.
    try {
      const guest = await findOne<{ id: string; stay_count: number }>('guests', [
        { field: 'id', operator: '=', value: existing.guest_id },
      ])
      if (guest) {
        await updateById('guests', guest.id, { stay_count: Number(guest.stay_count ?? 0) + 1 })
      }
    } catch (_error) {
      /* see above */
    }
  }

  return (result.data ?? result) as ReservationRow
}

/** Reservations arriving (check_in = date) or departing (check_out = date). */
export async function reservationsForDay(
  dateIso: string,
  kind: 'arrivals' | 'departures',
): Promise<ReservationRow[]> {
  const field = kind === 'arrivals' ? 'check_in' : 'check_out'
  const where: WhereCondition[] = [{ field, operator: '=', value: dateIso }]
  if (kind === 'arrivals') {
    where.push({ field: 'status', operator: 'in', value: ['held', 'confirmed', 'checked_in'] })
  } else {
    where.push({ field: 'status', operator: 'in', value: ['checked_in', 'confirmed'] })
  }
  return findMany<ReservationRow>('reservations', {
    where,
    orderBy: [{ field: field, direction: 'asc' }],
  })
}
