/**
 * Telemedicine — response decorators.
 *
 * The frontend pages expect a richer shape than the raw DB rows:
 *   - `appointments` → needs `scheduled_for`, `patient_id`, `patient_name`,
 *     `patient_age`, `patient_dob`, `provider`
 *   - `prescriptions` → needs `drug`, `dose`, `quantity`, `refills_left`,
 *     `pharmacy`, `prescriber`, `patient_name`, `patient_id`
 *   - `medical_records` → needs `date`, `summary`, `type`, `status`,
 *     `patient_name`, `provider`, `patient_id`
 *   - `providers` → `rating` is `numeric` in PG which the driver returns
 *     as a string; coerce to number so `.toFixed(1)` doesn't crash
 *   - `notifications` → kind+payload (json) needs to be flattened to
 *     `type`, `title`, `body`, `unread`, `href`, `created_at`
 *
 * Each decorator is async only when it needs to look up names (users,
 * providers) — and batches the lookup to a single SQL round trip rather
 * than N+1 per row.
 */

import { findById, query } from '@molecule/api-database'

interface UserRow extends Record<string, unknown> {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: Record<string, unknown> | null
}

interface ProviderRow extends Record<string, unknown> {
  id: string
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  title?: string | null
  user_id?: string | null
}

const collect = <T extends Record<string, unknown>>(rows: T[], key: keyof T): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of rows) {
    const v = r[key]
    if (typeof v === 'string' && v.length > 0 && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

async function loadUsers(ids: string[]): Promise<Map<string, UserRow>> {
  const out = new Map<string, UserRow>()
  if (ids.length === 0) return out
  try {
    const params = ids.map((_, i) => `$${i + 1}`).join(',')
    const result = await query<UserRow>(
      `SELECT id, name, email, "oauthData" AS "oauthData" FROM users WHERE id IN (${params})`,
      ids,
    )
    for (const r of result.rows ?? []) out.set(r.id, r)
  } catch (_error) {
    // table missing or query failed — return empty map; callers fall back.
  }
  return out
}

async function loadProviders(ids: string[]): Promise<Map<string, ProviderRow>> {
  const out = new Map<string, ProviderRow>()
  if (ids.length === 0) return out
  try {
    const params = ids.map((_, i) => `$${i + 1}`).join(',')
    const result = await query<ProviderRow>(
      `SELECT id, display_name, first_name, last_name, title, user_id FROM providers WHERE id IN (${params})`,
      ids,
    )
    for (const r of result.rows ?? []) out.set(r.id, r)
  } catch (_error) {
    // empty fallback — providers page will still render initials.
  }
  return out
}

function nameFromUser(u: UserRow | null | undefined): string {
  if (!u) return 'You'
  return (u.name && String(u.name).trim()) || (u.email ? String(u.email).split('@')[0] : 'You')
}

function dobFromUser(u: UserRow | null | undefined): string | null {
  const oauth = (u?.oauthData ?? {}) as Record<string, unknown>
  const dob = oauth.dob
  return typeof dob === 'string' ? dob : null
}

function ageFromDob(dob: string | null): number {
  if (!dob) return 0
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
}

function providerDisplayName(p: ProviderRow | null | undefined): string {
  if (!p) return 'Care team'
  if (p.display_name) return String(p.display_name)
  const parts = [p.title, p.first_name, p.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Care team'
}

const TYPE_FROM_KIND: Record<string, 'visit' | 'lab' | 'rx' | 'imaging' | 'note'> = {
  lab: 'lab',
  imaging: 'imaging',
  upload: 'note',
  discharge: 'note',
  note: 'note',
  visit: 'visit',
  rx: 'rx',
}

interface AppointmentRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  scheduled_at?: string | Date
  duration_minutes?: number
  type?: string
  reason?: string | null
  status?: string
  summary?: string | null
  completed_at?: string | Date | null
  cancelled_at?: string | Date | null
  created_at?: string | Date
}

export async function decorateAppointments<T extends AppointmentRow>(
  rows: T[],
): Promise<
  Array<
    T & {
      scheduled_for: string | null
      patient_id: string | null
      patient_name: string
      patient_age: number
      patient_dob: string | null
      provider: string
      type: AppointmentRow['type']
    }
  >
> {
  if (rows.length === 0) return [] as never
  const userIds = collect(rows, 'patient_user_id')
  const providerIds = collect(rows, 'provider_id')
  const [users, providers] = await Promise.all([loadUsers(userIds), loadProviders(providerIds)])
  return rows.map((r) => {
    const u = r.patient_user_id ? users.get(r.patient_user_id) : null
    const p = r.provider_id ? providers.get(r.provider_id) : null
    const dob = dobFromUser(u)
    return {
      ...r,
      scheduled_for: r.scheduled_at
        ? typeof r.scheduled_at === 'string'
          ? r.scheduled_at
          : (r.scheduled_at as Date).toISOString()
        : null,
      patient_id: r.patient_user_id ?? null,
      patient_name: nameFromUser(u),
      patient_age: ageFromDob(dob),
      patient_dob: dob,
      provider: providerDisplayName(p),
      type: r.type === 'audio' ? 'phone' : (r.type ?? 'video'),
    }
  })
}

interface PrescriptionRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  drug_name?: string | null
  medication_name?: string | null
  dosage?: string | null
  frequency?: string | null
  refills?: number | null
  refills_allowed?: number | null
  refills_used?: number | null
  pharmacy_id?: string | null
  status?: string
  prescribed_at?: string | Date | null
}

export async function decoratePrescriptions<T extends PrescriptionRow>(
  rows: T[],
): Promise<
  Array<
    T & {
      drug: string
      dose: string
      quantity: number
      refills_left: number
      pharmacy: string
      prescriber: string
      patient_id: string | null
      patient_name: string
      status: string
    }
  >
> {
  if (rows.length === 0) return [] as never
  const userIds = collect(rows, 'patient_user_id')
  const providerIds = collect(rows, 'provider_id')
  const [users, providers] = await Promise.all([loadUsers(userIds), loadProviders(providerIds)])
  return rows.map((r) => {
    const u = r.patient_user_id ? users.get(r.patient_user_id) : null
    const p = r.provider_id ? providers.get(r.provider_id) : null
    const allowed = r.refills_allowed ?? r.refills ?? 0
    const used = r.refills_used ?? 0
    const refillsLeft = Math.max(0, allowed - used)
    const status =
      r.status === 'sent_to_pharmacy'
        ? 'pending_pharmacy'
        : r.status === 'discontinued'
          ? 'cancelled'
          : (r.status ?? 'active')
    return {
      ...r,
      drug: r.drug_name || r.medication_name || 'Medication',
      dose: r.dosage ?? '—',
      quantity: 30,
      refills_left: refillsLeft,
      pharmacy: 'Pickup pharmacy',
      prescriber: providerDisplayName(p),
      patient_id: r.patient_user_id ?? null,
      patient_name: nameFromUser(u),
      status,
    }
  })
}

interface RecordRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  kind?: string
  type?: string
  title?: string | null
  description?: string | null
  occurred_on?: string | Date | null
  record_date?: string | Date | null
  created_at?: string | Date
  source?: string | null
}

export async function decorateRecords<T extends RecordRow>(
  rows: T[],
): Promise<
  Array<
    T & {
      date: string
      summary: string
      type: 'visit' | 'lab' | 'rx' | 'imaging' | 'note'
      status: 'final'
      patient_name: string
      patient_id: string | null
      provider: string
    }
  >
> {
  if (rows.length === 0) return [] as never
  const userIds = collect(rows, 'patient_user_id')
  const providerIds = collect(rows, 'provider_id')
  const [users, providers] = await Promise.all([loadUsers(userIds), loadProviders(providerIds)])
  return rows.map((r) => {
    const u = r.patient_user_id ? users.get(r.patient_user_id) : null
    const p = r.provider_id ? providers.get(r.provider_id) : null
    const date =
      r.occurred_on || r.record_date || r.created_at
        ? new Date((r.occurred_on || r.record_date || r.created_at) as string | Date).toISOString()
        : new Date().toISOString()
    const kind = String(r.kind ?? r.type ?? 'note').toLowerCase()
    const type = TYPE_FROM_KIND[kind] ?? 'note'
    return {
      ...r,
      date,
      summary: r.title || r.description || 'Record',
      type,
      status: 'final' as const,
      patient_name: nameFromUser(u),
      patient_id: r.patient_user_id ?? null,
      provider: providerDisplayName(p),
    }
  })
}

interface ProviderListRow extends Record<string, unknown> {
  rating?: number | string | null
  consultation_fee?: number | string | null
  hourly_rate_cents?: number | string | null
  total_reviews?: number | string | null
  total_consultations?: number | string | null
}

const num = (v: unknown, fallback = 0): number => {
  if (v == null || v === '') return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function decorateProviders<T extends ProviderListRow>(rows: T[]): T[] {
  return rows.map((r) => ({
    ...r,
    rating: num(r.rating, 0),
    consultation_fee: num(r.consultation_fee, 0),
    hourly_rate_cents: num(r.hourly_rate_cents, 0),
    total_reviews: num(r.total_reviews, 0),
    total_consultations: num(r.total_consultations, 0),
  }))
}

export function decorateProvider<T extends ProviderListRow>(row: T): T {
  return {
    ...row,
    rating: num(row.rating, 0),
    consultation_fee: num(row.consultation_fee, 0),
    hourly_rate_cents: num(row.hourly_rate_cents, 0),
    total_reviews: num(row.total_reviews, 0),
    total_consultations: num(row.total_consultations, 0),
  }
}

interface NotificationRow extends Record<string, unknown> {
  id: string
  user_id?: string
  kind?: string
  payload?: unknown
  read_at?: string | Date | null
  created_at?: string | Date
}

const NOTIF_HREF: Record<string, string> = {
  appointment: '/appointments',
  appointment_reminder: '/appointments',
  lab_result: '/records',
  rx_filled: '/prescriptions',
  message: '/messages',
  patient_at_risk: '/patients',
  system_message: '/dashboard',
}

const ALLOWED_TYPES = new Set([
  'appointment',
  'lab_result',
  'rx_filled',
  'message',
  'patient_at_risk',
  'system_message',
])

interface DecoratedNotification {
  id: string
  type:
    'appointment' | 'lab_result' | 'rx_filled' | 'message' | 'patient_at_risk' | 'system_message'
  title: string
  body: string
  href: string | null
  unread: boolean
  read_at: string | null
  created_at: string
}

export function decorateNotifications(rows: NotificationRow[]): DecoratedNotification[] {
  return rows.map((r) => {
    const payload = (() => {
      const p = r.payload
      if (p == null) return {} as Record<string, unknown>
      if (typeof p === 'string') {
        try {
          return JSON.parse(p) as Record<string, unknown>
        } catch (_error) {
          // malformed JSON payload — fall back to empty object
          return {} as Record<string, unknown>
        }
      }
      return p as Record<string, unknown>
    })()
    const rawKind = String(r.kind ?? '').toLowerCase()
    const type = (
      ALLOWED_TYPES.has(rawKind) ? rawKind : 'system_message'
    ) as DecoratedNotification['type']
    const href = NOTIF_HREF[rawKind] ?? null
    const created =
      r.created_at == null
        ? new Date().toISOString()
        : typeof r.created_at === 'string'
          ? r.created_at
          : (r.created_at as Date).toISOString()
    const readAt =
      r.read_at == null
        ? null
        : typeof r.read_at === 'string'
          ? r.read_at
          : (r.read_at as Date).toISOString()
    return {
      id: r.id,
      type,
      title: typeof payload.title === 'string' ? payload.title : 'Notification',
      body: typeof payload.body === 'string' ? payload.body : '',
      href,
      unread: readAt == null,
      read_at: readAt,
      created_at: created,
    }
  })
}

/**
 * Per-user lookup of (name, dob) — used by handlers that need a single
 * user without paying for a list-decorator round trip.
 */
export async function userBasics(userId: string): Promise<{
  name: string
  dob: string | null
  age: number
}> {
  const u = await findById<UserRow>('users', userId)
  const dob = dobFromUser(u)
  return { name: nameFromUser(u), dob, age: ageFromDob(dob) }
}
