/**
 * Shared formatting helpers.
 *
 * Postgres NUMERIC columns (salary_min / salary_max) arrive over the API as
 * STRINGS ("120000.0000") — calling `.toLocaleString()` on the raw value
 * renders the string verbatim ($120000.0000). Coerce with Number() first and
 * bail to '' when the value is not a finite number.
 */

export type NumericLike = number | string | null | undefined

/** Parse a possibly-string NUMERIC value into a finite number, else null. */
export function toNumber(value: NumericLike): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** "$70,000 – $90,000" / "From $70,000" / "Up to $90,000" / '' when unset. */
export function formatSalary(min: NumericLike, max: NumericLike): string {
  const lo = toNumber(min)
  const hi = toNumber(max)
  if (lo === null && hi === null) return ''
  if (lo !== null && hi !== null) return `$${lo.toLocaleString()} – $${hi.toLocaleString()}`
  if (lo !== null) return `From $${lo.toLocaleString()}`
  return `Up to $${hi!.toLocaleString()}`
}
