/**
 * Currency formatting helpers — Stipend renders all amounts with tabular-nums
 * for vertical alignment in tables and pay stubs.
 */

const fmtUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Coerce a numeric string (Postgres NUMERIC returns "12345.6700") to a number, NaN-safely. */
export function toNum(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0
  const v = typeof n === 'string' ? Number(n) : n
  return Number.isFinite(v) ? v : 0
}

export function fmtMoney(n: number | string | null | undefined): string {
  return fmtUsd.format(Math.abs(toNum(n)))
}

export function fmtMoneySigned(n: number | string | null | undefined): string {
  const v = toNum(n)
  const sign = v < 0 ? '-' : ''
  return `${sign}${fmtMoney(v)}`
}

export function fmtCompact(n: number | string | null | undefined): string {
  const v = toNum(n)
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toLocaleString()}`
}
