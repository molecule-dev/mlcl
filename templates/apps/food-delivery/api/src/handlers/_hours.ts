/**
 * Restaurant open-hours evaluation, shared by the restaurant decorator and order placement.
 *
 * @module
 */

/** JS Date.getDay() (0=Sunday … 6=Saturday) → the lowercase keys stored in opening_hours. */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.trim().split(':')
  return Number(h) * 60 + Number(m ?? 0)
}

/**
 * Whether the restaurant is open at `now` per its stored `opening_hours` — a jsonb map of
 * `{ mon: 'HH:MM-HH:MM', … }` (may arrive as an object or a JSON string). Returns `null` when the
 * open/closed state can't be determined (no hours configured, no window for today, or an
 * unparseable value) so callers can fall back to the restaurant's `status`.
 */
export function isOpenNow(openingHours: unknown, now: Date = new Date()): boolean | null {
  let hours: Record<string, unknown> | null = null
  if (typeof openingHours === 'string') {
    try {
      hours = JSON.parse(openingHours) as Record<string, unknown>
    } catch (_error) {
      // Malformed stored opening hours are treated as "unknown" — the caller renders no schedule.
      return null
    }
  } else if (openingHours && typeof openingHours === 'object') {
    hours = openingHours as Record<string, unknown>
  }
  if (!hours) return null
  const window = hours[DAY_KEYS[now.getDay()]]
  if (typeof window !== 'string' || !window.includes('-')) return null
  const [openStr, closeStr] = window.split('-')
  const openMin = toMinutes(openStr)
  const closeMin = toMinutes(closeStr)
  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin >= openMin && nowMin < closeMin
}
