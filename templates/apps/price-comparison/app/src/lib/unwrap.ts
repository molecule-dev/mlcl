export { unwrapList, unwrapSingle } from '@molecule/app-http'

/**
 * Format an integer cents value as USD ($1,234.56). Returns "—" for
 * non-finite inputs (covers the "no data yet" rendering path).
 */
export function fmtUsd(cents: number): string {
  if (!Number.isFinite(cents)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

/**
 * Format an ISO timestamp / Date / epoch ms as a human-readable relative
 * time like "5 minutes ago" / "in 2 hours". Returns "—" for unparseable
 * input.
 */
export function fmtRelative(input: Date | string | number): string {
  const ms = input instanceof Date ? input.getTime() : new Date(input).getTime()
  if (!Number.isFinite(ms)) return '—'
  const diffSec = Math.round((ms - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  const fmt = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  if (abs >= 31_536_000) return fmt.format(Math.round(diffSec / 31_536_000), 'year')
  if (abs >= 2_592_000) return fmt.format(Math.round(diffSec / 2_592_000), 'month')
  if (abs >= 604_800) return fmt.format(Math.round(diffSec / 604_800), 'week')
  if (abs >= 86_400) return fmt.format(Math.round(diffSec / 86_400), 'day')
  if (abs >= 3_600) return fmt.format(Math.round(diffSec / 3_600), 'hour')
  if (abs >= 60) return fmt.format(Math.round(diffSec / 60), 'minute')
  return fmt.format(diffSec, 'second')
}
