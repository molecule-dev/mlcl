/**
 * Lightweight typed mappers between DB row shapes (snake_case from
 * `/api/trips`, `/api/activities`, etc.) and the editorial card props
 * the UI components were originally designed against.
 */

import type { UpcomingTrip } from '../components/TripCountdownHeroCard.js'
import type { TripStatus, TripSummary } from '../components/TripCoverCard.js'

export interface TripRow {
  id: string
  user_id: string
  name: string
  destination: string | null
  country: string | null
  cover_url: string | null
  start_date: string | null
  end_date: string | null
  status: string
  budget_total_cents: number | string | null
  budget_used_cents: number | string | null
  share_token: string | null
  visibility: string | null
  timezone: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface ActivityRow {
  id: string
  user_id: string
  trip_id: string
  day_index: number | string
  position: number | string
  sort_order: number | string
  title: string
  kind: string
  date: string | null
  start_time: string | null
  starts_at: string | null
  ends_at: string | null
  location_name: string | null
  latitude: number | string | null
  longitude: number | string | null
  address: string | null
  notes: string | null
  cost_cents: number | string
  currency: string
}

export interface BookingRow {
  id: string
  user_id: string
  trip_id: string
  kind: 'flight' | 'hotel' | 'car' | 'other' | 'train' | 'activity'
  title: string
  detail: string | null
  start_at: string | null
  end_at: string | null
  confirmation_code: string | null
  status: string
  cost_cents: number | string
  currency: string
  vendor: string | null
}

export interface ExpenseRow {
  id: string
  user_id: string
  trip_id: string
  category: string
  amount_cents: number | string
  currency: string
  occurred_at: string
  vendor: string | null
  description: string | null
}

export interface NotificationRow {
  id: string
  user_id: string
  trip_id: string | null
  kind: string
  title: string
  body: string | null
  occurred_at: string
  read: boolean
  created_at: string
}

export interface CollaboratorRow {
  id: string
  trip_id: string
  user_id: string
  invited_by: string | null
  role: string
  invited_at: string
  accepted_at: string | null
  created_at: string
}

export type CollaboratorWithToken = CollaboratorRow & { token?: string }

const ALLOWED_STATUSES: ReadonlyArray<TripStatus> = [
  'confirmed',
  'tentative',
  'cancelled',
  'in_progress',
  'completed',
]

function coerceStatus(s: string | null): TripStatus {
  if (!s) return 'tentative'
  if (s === 'planning') return 'tentative'
  if (s === 'upcoming') return 'confirmed'
  if (s === 'active') return 'in_progress'
  if (s === 'archived') return 'completed'
  return ALLOWED_STATUSES.includes(s as TripStatus) ? (s as TripStatus) : 'tentative'
}

export function tripRowToSummary(row: TripRow): TripSummary {
  return {
    id: row.id,
    destination: row.destination ?? row.name,
    country: row.country ?? '',
    cover_url: row.cover_url ?? `https://picsum.photos/seed/${row.id}/1200/675`,
    start_iso: row.start_date ?? row.created_at,
    end_iso: row.end_date ?? row.start_date ?? row.created_at,
    status: coerceStatus(row.status),
    collaborators: [],
    stop_count: 0,
    budget_used_cents: Number(row.budget_used_cents ?? 0),
    budget_total_cents: Number(row.budget_total_cents ?? 0),
  }
}

export function tripRowToUpcoming(row: TripRow): UpcomingTrip {
  const status = coerceStatus(row.status)
  const upcomingStatus: UpcomingTrip['status'] =
    status === 'confirmed' || status === 'in_progress' ? status : 'tentative'
  return {
    id: row.id,
    destination: row.destination ?? row.name,
    country: row.country ?? '',
    cover_url: row.cover_url ?? `https://picsum.photos/seed/${row.id}/1200/675`,
    start_iso: row.start_date ?? row.created_at,
    end_iso: row.end_date ?? row.start_date ?? row.created_at,
    status: upcomingStatus,
    collaborator_count: 0,
    budget_used_cents: Number(row.budget_used_cents ?? 0),
    budget_total_cents: Number(row.budget_total_cents ?? 0),
  }
}

/** Pick the most "next-up" trip — soonest future-dated, fall back to in-progress, then most recent. */
export function pickUpcomingTrip(trips: TripRow[]): TripRow | null {
  if (trips.length === 0) return null
  const now = Date.now()
  const future = trips
    .filter((t) => t.start_date && new Date(t.start_date).getTime() > now)
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
  if (future[0]) return future[0]
  const active = trips.find((t) => t.status === 'in_progress' || t.status === 'active')
  if (active) return active
  return trips[0]
}
