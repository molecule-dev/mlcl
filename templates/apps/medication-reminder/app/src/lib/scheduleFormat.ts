/**
 * Wall-clock formatting for medication schedule/dose times.
 *
 * Doses are stored on the server with two complementary fields:
 *   - `scheduled_at`  — a UTC ISO timestamp, useful for sorting/storage but
 *     **not for display** because converting to local time will shift the
 *     wall-clock label off the user's intended hour (a 08:00 schedule shows
 *     as 11:00 for a UTC+3 user, etc.). The user typed "8 AM"; they want to
 *     see "8 AM" on every screen.
 *   - `scheduled_time` — the original "HH:MM" 24h string the user actually
 *     scheduled. This is what we render.
 *   - `scheduled_date` — the original "YYYY-MM-DD" calendar date for the
 *     dose, again as a wall-clock value (no timezone conversion).
 *
 * These helpers operate on those wall-clock strings directly, never round-
 * tripping through the Date constructor's timezone conversion.
 */

export type TimeFormat = '12h' | '24h'

/**
 * Format an "HH:MM" 24-hour string for display, honoring the user's
 * timeFormat preference. Returns the raw string on parse failure so the
 * UI never shows a blank.
 */
export function formatScheduledTime(hhmm: string, format: TimeFormat = '12h'): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm
  const hh = Math.max(0, Math.min(23, parseInt(m[1], 10) || 0))
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10) || 0))
  if (format === '24h') {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const period = hh >= 12 ? 'PM' : 'AM'
  const h12 = ((hh + 11) % 12) + 1
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`
}

/**
 * Parse the hour out of an "HH:MM" string for grid bucketing. Returns NaN if
 * the input doesn't match — callers should guard. We avoid `new Date(...)`
 * so the bucketing is agnostic to the browser's timezone.
 */
export function hourOfScheduledTime(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return NaN
  return parseInt(m[1], 10)
}

/**
 * Format a "YYYY-MM-DD" calendar date as a localized "Sun, May 10" label.
 * Builds the Date with the day's noon UTC anchor then renders in the local
 * timezone — noon is far enough from any DST boundary that the date never
 * spills onto a neighbour day. (Compare: parsing "2026-05-10" or building
 * with midnight UTC and rendering in a negative-UTC zone shifts the label
 * one day earlier.)
 */
export function formatScheduledDate(yyyymmdd: string, locale?: string | string[]): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd.trim())
  if (!m) return yyyymmdd
  const yyyy = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10) - 1
  const dd = parseInt(m[3], 10)
  // Use noon UTC and render in user's locale. The day-of-week + month-day
  // labels are stable in any timezone for noon.
  const d = new Date(Date.UTC(yyyy, mm, dd, 12, 0, 0))
  return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * Combine a "YYYY-MM-DD" + "HH:MM" into a single "Sun, May 10, 8:00 AM"-style
 * label without touching the user's local timezone.
 */
export function formatScheduledDateTime(
  yyyymmdd: string,
  hhmm: string,
  format: TimeFormat = '12h',
  locale?: string | string[],
): string {
  const date = formatScheduledDate(yyyymmdd, locale)
  const time = formatScheduledTime(hhmm, format)
  return `${date}, ${time}`
}

/**
 * Day-of-week index (0=Mon..6=Sun) for a "YYYY-MM-DD" date string. Built
 * from the noon-UTC anchor so the result is stable across timezones.
 */
export function weekdayIndexOfDate(yyyymmdd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd.trim())
  if (!m) return -1
  const d = new Date(
    Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0),
  )
  return (d.getUTCDay() + 6) % 7
}
