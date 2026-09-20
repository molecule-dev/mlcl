/**
 * Groundwork display formatters.
 *
 * All money in the app is integer CENTS end-to-end (DB columns
 * `*_cents`, API payloads, and these helpers) — floats never touch a
 * dollar amount.
 */

/** 1840000000 -> "$18,400,000"; 6900000 -> "$69,000" */
export function formatMoney(cents: number, compact = false): string {
  if (compact && Math.abs(cents) >= 1_000_000_00) {
    return `$${(cents / 100 / 1_000_000).toFixed(1)}M`
  }
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
}

/** ISO or "2026-09-19" -> "Sep 19" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** ISO or "2026-09-19" -> "Sep 19, 2026" */
export function formatDateLong(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** ISO string -> "Sep 19, 3:00 PM" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = formatDate(iso)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return date && time ? `${date}, ${time}` : date || time
}

/** ISO created_at -> "6d ago" (RFI aging buckets on the dashboard). */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}

/** Local day key ("2026-09-19") for date inputs and log grouping. */
export function dayKeyOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Pretty label for a phase/weather/status key: "site_work" -> "Site work". */
export function labelize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
