/**
 * Field-service display formatters.
 *
 * All money in the app is integer CENTS end-to-end (DB columns
 * `*_cents`, API payloads, and these helpers) — floats never touch a
 * dollar amount.
 */

/** 52800 -> "$528.00"; 119150 -> "$1,191.50" */
export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

/** ISO string -> "3:00 PM" (empty for null) */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** ISO string -> "Sep 19" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** ISO string -> "Sep 19, 3:00 PM" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = formatDate(iso)
  const time = formatTime(iso)
  return date && time ? `${date}, ${time}` : date || time
}

/** ISO string -> local "2026-09-19" (day bucket for lists/grids) */
export function dayKey(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local day key for a Date offset by N days from now. */
export function dayKeyOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday of the current week, as a Date. */
export function startOfWeek(base = new Date()): Date {
  const d = new Date(base)
  const dow = d.getDay() // 0 = Sunday
  const shift = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + shift)
  d.setHours(0, 0, 0, 0)
  return d
}
